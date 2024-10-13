/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { debounce } from 'lodash';
import React, { useState, useCallback, useEffect } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiLink,
  EuiBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Moment } from 'moment';
import { i18n } from '@kbn/i18n';
import { useMetricsDataViewContext } from '../../../containers/metrics_source';
import { FixedDatePicker } from '../../fixed_datepicker';
import { DEFAULT_K8S_PARTITION_FIELD } from '../../../containers/ml/modules/metrics_k8s/module_descriptor';
import { convertKueryToElasticSearchQuery } from '../../../utils/kuery';
import { MetricsExplorerKueryBar } from '../../../pages/metrics/metrics_explorer/components/kuery_bar';

interface Props {
  jobType: 'hosts' | 'kubernetes';
  setFilterQuery: (filter: string) => void;
  startDate: Moment;
  now: Moment;
  setStartDate: (date: Moment) => void;
  partitionField: string[] | null;
  setPartitionField: (partitionField: string[] | null) => void;
}

export const JobAdvancedSettings = (props: Props) => {
  const {
    jobType,
    setFilterQuery,
    startDate,
    setStartDate,
    now,
    partitionField,
    setPartitionField,
  } = props;
  const { metricsView } = useMetricsDataViewContext();
  const [filter, setFilter] = useState('');
  const [showRecommendedBadge, setShowRecommendedBadge] = useState(false);

  const updateStart = useCallback(
    (date: Moment) => {
      setStartDate(date);
    },
    [setStartDate]
  );

  const onFilterChange = useCallback(
    (f: string) => {
      setFilter(f || '');
      setFilterQuery(convertKueryToElasticSearchQuery(f, metricsView?.dataViewReference) || '');
    },
    [metricsView?.dataViewReference, setFilterQuery]
  );

  const debouncedOnFilterChange = useCallback(
    () => debounce(onFilterChange, 500),
    [onFilterChange]
  );

  const onPartitionFieldChange = useCallback(
    (value: Array<{ label: string }>) => {
      setPartitionField(value.map((v) => v.label));
    },
    [setPartitionField]
  );

  useEffect(() => {
    if (jobType === 'kubernetes') {
      setPartitionField([DEFAULT_K8S_PARTITION_FIELD]);
    }
  }, [jobType, setPartitionField]);

  useEffect(() => {
    setShowRecommendedBadge(false);
    if (jobType === 'hosts' && partitionField && partitionField.length > 0) {
      setShowRecommendedBadge(true);
    }
  }, [jobType, partitionField]);

  return (
    <EuiForm>
      <EuiDescribedFormGroup
        title={
          <h3>
            <FormattedMessage
              id="xpack.infra.ml.steps.setupProcess.when.title"
              defaultMessage="When does your model begin?"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.infra.ml.steps.setupProcess.when.description"
            defaultMessage="By default, machine learning jobs analyze the last 4 weeks of data and continue to run indefinitely."
          />
        }
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.infra.ml.steps.setupProcess.when.timePicker.label"
              defaultMessage="Start date"
            />
          }
        >
          <FixedDatePicker
            showTimeSelect
            selected={startDate}
            onChange={updateStart}
            maxDate={now}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        title={
          <h3>
            {jobType === 'hosts' ? (
              <FormattedMessage
                id="xpack.infra.ml.steps.setupProcess.partition.hosts.title"
                defaultMessage="How do you want to partition the analysis?"
              />
            ) : (
              <FormattedMessage
                id="xpack.infra.ml.steps.setupProcess.partition.title"
                defaultMessage="How do you want to partition your data?"
              />
            )}
          </h3>
        }
        description={
          jobType === 'hosts' ? (
            <FormattedMessage
              id="xpack.infra.ml.steps.setupProcess.partition.hosts.description"
              defaultMessage="If you are using a partition, we would recommend applying a filtering to only evaluate the hosts that are really important to you to optimize performance. For example, you may apply a filter to only detect anomalies on a particular machine type so other machine types are not evaluated. {link}"
              values={{
                link: (
                  <EuiLink
                    data-test-subj="infraMlHostsPartitionDocumentationLink"
                    href="https://ela.st/infra-anomaly-partition"
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.infra.ml.steps.setupProcess.DocumentationLink.text"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.infra.ml.steps.setupProcess.partition.description"
              defaultMessage="Partitions enable you to build independent models for groups of data that share similar behavior. For example, you can partition by machine type or cloud availability zone."
            />
          )
        }
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.infra.ml.steps.setupProcess.partition.label"
              defaultMessage="Partition field"
            />
          }
          display="rowCompressed"
        >
          <EuiComboBox
            placeholder={i18n.translate('xpack.infra.metricsExplorer.groupByLabel', {
              defaultMessage: 'Everything',
            })}
            aria-label={i18n.translate('xpack.infra.metricsExplorer.groupByAriaLabel', {
              defaultMessage: 'Graph per',
            })}
            fullWidth
            singleSelection={true}
            selectedOptions={partitionField ? partitionField.map((p) => ({ label: p })) : undefined}
            options={(metricsView?.fields ?? [])
              .filter((f) => f.aggregatable && f.type === 'string')
              .map((f) => ({ label: f.name }))}
            onChange={onPartitionFieldChange}
            isClearable={true}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        title={
          <h3>
            {jobType === 'hosts' ? (
              <>
                <FormattedMessage
                  id="xpack.infra.ml.steps.setupProcess.filter.hosts.title"
                  defaultMessage="Which Hosts would you like to detect anomalies on?"
                />{' '}
                {showRecommendedBadge && (
                  <EuiBadge color="accent">
                    {i18n.translate('xpack.infra.jobAdvanceSettings.recommendedBadgeLabel', {
                      defaultMessage: 'Recommended',
                    })}
                  </EuiBadge>
                )}
              </>
            ) : (
              <FormattedMessage
                id="xpack.infra.ml.steps.setupProcess.filter.title"
                defaultMessage="Filter"
              />
            )}
          </h3>
        }
        description={
          jobType === 'hosts' ? (
            <FormattedMessage
              id="xpack.infra.ml.steps.setupProcess.filter.hosts.description"
              defaultMessage="You can optionally partition the data to build independent baselines for groups of data that share the same characteristics. For example, you might choose to partition by machine type or availability zone. {link}"
              values={{
                link: (
                  <EuiLink
                    data-test-subj="infraMlHostsFilterDocumentationLink"
                    href="https://ela.st/infra-host-ad-filtering"
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.infra.ml.steps.setupProcess.DocumentationLink.text"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.infra.ml.steps.setupProcess.filter.description"
              defaultMessage="By default, machine learning jobs analyze all of your metric data."
            />
          )
        }
      >
        <EuiFormRow
          display="rowCompressed"
          label={
            <FormattedMessage
              id="xpack.infra.ml.steps.setupProcess.filter.label"
              defaultMessage="Filter (optional)"
            />
          }
        >
          <MetricsExplorerKueryBar
            onSubmit={onFilterChange}
            onChange={debouncedOnFilterChange}
            value={filter}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiForm>
  );
};
