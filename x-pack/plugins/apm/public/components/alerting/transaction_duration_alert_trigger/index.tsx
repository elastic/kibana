/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiFlexGroup,
  EuiTitle,
  EuiButtonEmpty,
  EuiButton,
  EuiPopover,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { defaults, map, omit } from 'lodash';
import React, { useEffect, useState } from 'react';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ForLastExpression } from '@kbn/triggers-actions-ui-plugin/public';
import {
  TRANSACTION_NAME,
  CONTAINER_ID,
  KUBERNETES_POD_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getDurationFormatter } from '../../../../common/utils/formatters';
import { useFetcher } from '../../../hooks/use_fetcher';
import { createCallApmApi } from '../../../services/rest/create_call_apm_api';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../shared/charts/transaction_charts/helper';
import { ChartPreview } from '../chart_preview';
import {
  CustomFilterField,
  EnvironmentField,
  IsAboveField,
  ServiceField,
  TransactionTypeField,
} from '../fields';
import { AlertMetadata, getIntervalAndTimeRange, TimeUnit } from '../helper';
import { PopoverExpression } from '../service_alert_trigger/popover_expression';

export interface RuleParams {
  aggregationType: 'avg' | '95th' | '99th';
  environment: string;
  serviceName: string;
  threshold: number;
  transactionType: string;
  windowSize: number;
  windowUnit: string;
}

const TRANSACTION_ALERT_AGGREGATION_TYPES = {
  avg: i18n.translate(
    'xpack.apm.transactionDurationAlert.aggregationType.avg',
    {
      defaultMessage: 'Average',
    }
  ),
  '95th': i18n.translate(
    'xpack.apm.transactionDurationAlert.aggregationType.95th',
    {
      defaultMessage: '95th percentile',
    }
  ),
  '99th': i18n.translate(
    'xpack.apm.transactionDurationAlert.aggregationType.99th',
    {
      defaultMessage: '99th percentile',
    }
  ),
};

interface Props {
  ruleParams: RuleParams;
  metadata?: AlertMetadata;
  setRuleParams: (key: string, value: any) => void;
}

export function TransactionDurationAlertTrigger({
  ruleParams,
  metadata,
  setRuleParams,
}: Props) {
  const { services } = useKibana();
  const params = defaults(
    {
      ...omit(metadata, ['start', 'end']),
      ...ruleParams,
    },
    {
      aggregationType: 'avg',
      threshold: 1500,
      windowSize: 5,
      windowUnit: 'm',
      environment: ENVIRONMENT_ALL.value,
    }
  );

  const [customFilters, setCustomFilters] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => createCallApmApi(services as CoreStart), [services]);
  useInitialRuleValues({ ruleParams: params, setRuleParams });

  const { data } = useFetcher(
    (callApmApi) => {
      const { interval, start, end } = getIntervalAndTimeRange({
        windowSize: params.windowSize,
        windowUnit: params.windowUnit as TimeUnit,
      });
      if (interval && start && end) {
        return callApmApi(
          'GET /internal/apm/alerts/chart_preview/transaction_duration',
          {
            params: {
              query: {
                aggregationType: params.aggregationType,
                environment: params.environment,
                serviceName: params.serviceName,
                transactionType: params.transactionType,
                interval,
                start,
                end,
              },
            },
          }
        );
      }
    },
    [
      params.aggregationType,
      params.environment,
      params.serviceName,
      params.transactionType,
      params.windowSize,
      params.windowUnit,
    ]
  );

  const latencyChartPreview = data?.latencyChartPreview ?? [];

  const maxY = getMaxY([{ data: latencyChartPreview }]);
  const formatter = getDurationFormatter(maxY);
  const yTickFormat = getResponseTimeTickFormatter(formatter);

  // The threshold from the form is in ms. Convert to µs.
  const thresholdMs = params.threshold * 1000;

  const chartPreview = (
    <ChartPreview
      data={latencyChartPreview}
      threshold={thresholdMs}
      yTickFormat={yTickFormat}
      uiSettings={services.uiSettings}
    />
  );

  const filterFields = [
    <ServiceField
      currentValue={params.serviceName}
      onChange={(value) => setRuleParams('serviceName', value)}
    />,
    <EnvironmentField
      currentValue={params.environment}
      onChange={(value) => setRuleParams('environment', value)}
    />,
    <TransactionTypeField
      currentValue={params.transactionType}
      onChange={(value) => setRuleParams('transactionType', value)}
    />,
  ];

  const fields = [
    <PopoverExpression
      value={params.aggregationType}
      title={i18n.translate('xpack.apm.transactionDurationAlertTrigger.when', {
        defaultMessage: 'When',
      })}
    >
      <EuiSelect
        value={params.aggregationType}
        options={map(TRANSACTION_ALERT_AGGREGATION_TYPES, (label, key) => {
          return {
            text: label,
            value: key,
          };
        })}
        onChange={(e) => setRuleParams('aggregationType', e.target.value)}
        compressed
      />
    </PopoverExpression>,
    <IsAboveField
      value={params.threshold}
      unit={i18n.translate('xpack.apm.transactionDurationAlertTrigger.ms', {
        defaultMessage: 'ms',
      })}
      onChange={(value) => setRuleParams('threshold', value || 0)}
    />,
    <ForLastExpression
      onChangeWindowSize={(timeWindowSize) =>
        setRuleParams('windowSize', timeWindowSize || '')
      }
      onChangeWindowUnit={(timeWindowUnit) =>
        setRuleParams('windowUnit', timeWindowUnit)
      }
      timeWindowSize={params.windowSize}
      timeWindowUnit={params.windowUnit}
      errors={{
        timeWindowSize: [],
        timeWindowUnit: [],
      }}
    />,
  ];

  return (
    <>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h4>Filters</h4>
      </EuiTitle>
      <EuiFlexGroup gutterSize="m" direction="column">
        {filterFields.map((field, index) => (
          <EuiFlexItem key={index}>{field}</EuiFlexItem>
        ))}
      </EuiFlexGroup>

      <EuiFlexGroup gutterSize="m" direction="column">
        {Object.entries(customFilters).map(([fieldName, fieldValue]) => (
          <>
            <EuiFlexItem key={fieldName}>
              <EuiFlexGroup gutterSize="m" direction="row">
                <EuiFlexItem>
                  <CustomFilterField
                    serviceName={params.serviceName}
                    fieldName={fieldName}
                    currentValue={fieldValue}
                    title={fieldName}
                    onChange={(value) => {
                      if (value) {
                        setCustomFilters((state) => {
                          return { ...state, [fieldName]: value };
                        });
                      }
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiIcon type="cross" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </>
        ))}
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <AddFilterButton
        customFilters={customFilters}
        onClickAddCustomFilter={(value) =>
          setCustomFilters((state) => ({ ...state, [value]: '' }))
        }
      />

      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h4>Conditions</h4>
      </EuiTitle>
      <EuiFlexGrid gutterSize="l" direction="row" columns={2}>
        {fields.map((field, index) => (
          <EuiFlexItem grow={false} key={index}>
            {field}
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      {chartPreview}
      <EuiSpacer size="m" />
    </>
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default TransactionDurationAlertTrigger;

function useInitialRuleValues({
  setRuleParams,
  ruleParams,
}: {
  setRuleParams: (key: string, value: any) => void;
  ruleParams: Record<string, any>;
}) {
  // const params: Record<string, any> = {
  //   ...ruleParams,
  // };

  useEffect(() => {
    // we only want to run this on mount to set default values
    Object.keys(ruleParams).forEach((key) => {
      setRuleParams(key, ruleParams[key]);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

const INITIAL_CUSTOM_FILTERS = [
  {
    fieldLabel: 'Transaction name',
    fieldName: TRANSACTION_NAME,
  },
  {
    fieldLabel: 'Container id',
    fieldName: CONTAINER_ID,
  },
  {
    fieldLabel: 'Pod id',
    fieldName: KUBERNETES_POD_NAME,
  },
];

function AddFilterButton({
  customFilters,
  onClickAddCustomFilter,
}: {
  customFilters: Record<string, string>;
  onClickAddCustomFilter: (value: string) => void;
}) {
  const options = INITIAL_CUSTOM_FILTERS.filter(
    (item) => !customFilters[item.fieldName]
  );
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>();

  useEffect(() => {
    if (options.length > 0) {
      setSelectedFilter(options[0].fieldName);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFilters]);

  if (options.length === 0) {
    return null;
  }

  return (
    <EuiPopover
      isOpen={popoverOpen}
      anchorPosition="downLeft"
      closePopover={() => setPopoverOpen(false)}
      button={
        <EuiButtonEmpty
          size="s"
          onClick={() => setPopoverOpen((state) => !state)}
        >
          Add filter
        </EuiButtonEmpty>
      }
      repositionOnScroll
    >
      <EuiSelect
        value={selectedFilter}
        options={options.map((option) => ({
          text: option.fieldLabel,
          value: option.fieldName,
        }))}
        compressed
        onChange={(e) => setSelectedFilter(e.target.value)}
      />
      <EuiButton
        disabled={!selectedFilter}
        onClick={() => {
          if (selectedFilter) {
            setPopoverOpen(false);
            onClickAddCustomFilter(selectedFilter);
          }
        }}
      >
        Add
      </EuiButton>
    </EuiPopover>
  );
}
