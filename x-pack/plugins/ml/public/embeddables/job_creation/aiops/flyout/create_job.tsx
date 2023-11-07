/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState, useEffect } from 'react'; // useCallback
import { FormattedMessage } from '@kbn/i18n-react';
import type { Embeddable } from '@kbn/lens-plugin/public';

import {
  EuiCheckableCard,
  EuiTitle,
  EuiSpacer,
  EuiSwitch,
  EuiHorizontalRule,
  EuiComboBoxOptionOption,
  EuiComboBox,
  EuiFormRow,
  EuiCallOut,
} from '@elastic/eui';

import { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
// import type { Embeddable } from '@kbn/lens-plugin/public';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { redirectToADJobWizards } from '../../../../application/jobs/new_job/job_from_pattern_analysis/utils';
import { createFieldOptions } from '../../../../application/jobs/new_job/common/job_creator/util/general';
import { NewJobCapsService } from '../../../../application/services/new_job_capabilities/new_job_capabilities_service';
import {
  CategorizationType,
  CATEGORIZATION_TYPE,
  QuickCategorizationJobCreator,
} from '../../../../application/jobs/new_job/job_from_pattern_analysis';
// import type { LayerResult } from '../../../../application/jobs/new_job/job_from_lens';
import { useMlFromLensKibanaContext } from '../../common/context';
import { JobDetails, CreateADJobParams } from '../../common/job_details';

interface Props {
  dataView: DataView;
  field: DataViewField;
  query: QueryDslQueryContainer;
  timeRange: TimeRange;
}

export const CreateJob: FC<Props> = ({ dataView, field, query, timeRange }) => {
  const {
    services: {
      data,
      share,
      uiSettings,
      mlServices: { mlApiServices },
      dashboardService,
    },
  } = useMlFromLensKibanaContext();

  // console.log('dataView', dataView);
  // console.log('field', field);
  // console.log('query', query);
  // console.log('timeRange', timeRange);

  const [categorizationType, setCategorizationType] = useState<CategorizationType>(
    CATEGORIZATION_TYPE.COUNT
  );
  const [enablePerPartitionCategorization, setEnablePerPartitionCategorization] = useState(false);
  // const [stopOnWarn, setStopOnWarn] = useState(false);
  const [categoryFieldOptions, setCategoryFieldsOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [selectedPartitionFieldOptions, setSelectedPartitionFieldOptions] = useState<
    EuiComboBoxOptionOption[]
  >([]);

  const toggleEnablePerPartitionCategorization = useCallback(
    () => setEnablePerPartitionCategorization(!enablePerPartitionCategorization),
    [enablePerPartitionCategorization]
  );

  // const toggleStopOnWarn = useCallback(() => setStopOnWarn(!stopOnWarn), [stopOnWarn]);

  useMemo(() => {
    const newJobCapsService = new NewJobCapsService();
    newJobCapsService.initializeFromDataVIew(dataView).then(() => {
      const options: EuiComboBoxOptionOption[] = [
        ...createFieldOptions(newJobCapsService.categoryFields, []),
      ].map((o) => ({
        ...o,
      }));
      setCategoryFieldsOptions(options);
      // setCategoryFields(newJobCapsService.categoryFields);
    });
  }, [dataView]);

  const quickJobCreator = useMemo(
    () =>
      new QuickCategorizationJobCreator(
        uiSettings,
        data.query.timefilter.timefilter,
        dashboardService,
        data,
        mlApiServices
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, uiSettings]
  );

  function createADJobInWizard() {
    const partitionField = selectedPartitionFieldOptions.length
      ? dataView.getFieldByName(selectedPartitionFieldOptions[0].label) ?? null
      : null;
    redirectToADJobWizards(
      categorizationType,
      dataView,
      field,
      partitionField,
      query,
      timeRange,
      share
    );
  }

  useEffect(() => {
    if (enablePerPartitionCategorization) {
      setSelectedPartitionFieldOptions([]);
    }
  }, [enablePerPartitionCategorization]);

  async function createADJob({
    jobId,
    bucketSpan,
    embeddable: lensEmbeddable,
    startJob,
    runInRealTime,
  }: CreateADJobParams) {
    const partitionField = selectedPartitionFieldOptions.length
      ? dataView.getFieldByName(selectedPartitionFieldOptions[0].label) ?? null
      : null;
    const result = await quickJobCreator.createAndSaveJob(
      categorizationType,
      jobId,
      bucketSpan,
      dataView,
      field,
      partitionField,
      query,
      timeRange,
      startJob,
      runInRealTime,
      0
    );
    return result;
  }

  const embeddable: Embeddable = {
    getInput: () => ({
      from: '',
      to: '',
    }),
  } as unknown as Embeddable;

  return (
    <>
      <JobDetails
        createADJob={createADJob}
        createADJobInWizard={createADJobInWizard}
        embeddable={embeddable}
        layer={undefined}
        layerIndex={0}
      >
        <>
          <EuiCheckableCard
            id={'count'}
            label={
              <>
                <EuiTitle size="xs">
                  <h5>
                    <FormattedMessage defaultMessage="Count" id="xpack.ml.newJob.changeMe" />
                  </h5>
                </EuiTitle>
                <EuiSpacer size="s" />
                <FormattedMessage
                  defaultMessage="Look for anomalies in the event rate of a category."
                  id="xpack.ml.newJob.changeMe"
                />
              </>
            }
            checked={categorizationType === CATEGORIZATION_TYPE.COUNT}
            onChange={() => setCategorizationType(CATEGORIZATION_TYPE.COUNT)}
          />

          <EuiSpacer size="m" />

          <EuiCheckableCard
            id={'rare'}
            label={
              <>
                <EuiTitle size="xs">
                  <h5>
                    <FormattedMessage defaultMessage="Rare" id="xpack.ml.newJob.changeMe" />
                  </h5>
                </EuiTitle>
                <EuiSpacer size="s" />
                <FormattedMessage
                  defaultMessage="Look for categories that occur rarely in time."
                  id="xpack.ml.newJob.changeMe"
                />
              </>
            }
            checked={categorizationType === CATEGORIZATION_TYPE.RARE}
            onChange={() => setCategorizationType(CATEGORIZATION_TYPE.RARE)}
          />
          <EuiSpacer size="m" />
          <EuiSwitch
            name="categorizationPerPartitionSwitch"
            disabled={false}
            checked={enablePerPartitionCategorization}
            onChange={toggleEnablePerPartitionCategorization}
            data-test-subj="mlJobWizardSwitchCategorizationPerPartition"
            label={
              <FormattedMessage
                id="xpack.ml.newJob.wizard.perPartitionCategorizationSwitchLabel"
                defaultMessage="Enable per-partition categorization"
              />
            }
          />

          {enablePerPartitionCategorization ? (
            <>
              <EuiSpacer size="m" />

              <EuiCallOut
                size="s"
                title="Determine categories independently for each value of the partition field."
              />

              <EuiSpacer size="m" />

              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.extraStep.categorizationJob.categorizationPerPartitionFieldLabel"
                    defaultMessage="Partition field"
                  />
                }
              >
                <EuiComboBox
                  singleSelection={{ asPlainText: true }}
                  options={categoryFieldOptions}
                  selectedOptions={selectedPartitionFieldOptions}
                  onChange={setSelectedPartitionFieldOptions}
                  isClearable={true}
                  data-test-subj="mlJobWizardCategorizationPerPartitionFieldNameSelect"
                  // renderOption={renderOption}
                />
              </EuiFormRow>

              {/* <EuiSpacer size="m" />

              <EuiSwitch
                name="categorizationPerPartitionSwitch"
                disabled={false}
                checked={stopOnWarn}
                onChange={toggleStopOnWarn}
                data-test-subj="mlJobWizardSwitchCategorizationPerPartition"
                label={
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.perPartitionCategorizationSwitchLabel"
                    defaultMessage="Stop on warn"
                  />
                }
              /> */}
            </>
          ) : null}

          <EuiSpacer size="m" />

          <EuiHorizontalRule margin="m" />

          {/* <CountCard
            onClick={() => setCategorizationType(CATEGORIZATION_TYPE.COUNT)}
            isSelected={categorizationType === CATEGORIZATION_TYPE.COUNT}
          />
          <RareCard
            onClick={() => setCategorizationType(CATEGORIZATION_TYPE.RARE)}
            isSelected={categorizationType === CATEGORIZATION_TYPE.RARE}
          /> */}
        </>
        {/* <EuiFlexGroup gutterSize="s" data-test-subj="mlLensLayerCompatible">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiIcon type="checkInCircleFilled" color="success" />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              {layer.jobType === JOB_TYPE.MULTI_METRIC ? (
                <FormattedMessage
                  id="xpack.ml.embeddables.lensLayerFlyout.createJobCalloutTitle.multiMetric"
                  defaultMessage="This layer can be used to create a multi-metric job"
                />
              ) : (
                <FormattedMessage
                  id="xpack.ml.embeddables.lensLayerFlyout.createJobCalloutTitle.singleMetric"
                  defaultMessage="This layer can be used to create a single metric job"
                />
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup> */}
      </JobDetails>
    </>
  );
};
