/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { defaults, map, omit } from 'lodash';
import React, { useCallback, useEffect } from 'react';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ForLastExpression, TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiSwitchEvent } from '@elastic/eui';
import { SearchConfigurationType } from '../../../../../common/rules/schema';
import { AggregationType } from '../../../../../common/rules/apm_rule_types';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import { FETCH_STATUS, isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { createCallApmApi } from '../../../../services/rest/create_call_apm_api';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../../shared/charts/transaction_charts/helper';
import { ChartPreview } from '../../ui_components/chart_preview';
import {
  EnvironmentField,
  IsAboveField,
  ServiceField,
  TransactionTypeField,
  TransactionNameField,
} from '../../utils/fields';
import { AlertMetadata, getIntervalAndTimeRange } from '../../utils/helper';
import { ApmRuleParamsContainer } from '../../ui_components/apm_rule_params_container';
import { PopoverExpression } from '../../ui_components/popover_expression';
import { APMRuleGroupBy } from '../../ui_components/apm_rule_group_by';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import {
  ErrorState,
  LoadingState,
  NoDataState,
} from '../../ui_components/chart_preview/chart_preview_helper';
import { ApmRuleKqlFilter } from '../../ui_components/apm_rule_kql_filter';

export interface TransactionDurationRuleParams {
  aggregationType: AggregationType;
  environment: string;
  threshold: number;
  transactionType?: string;
  transactionName?: string;
  serviceName?: string;
  windowSize: number;
  windowUnit: string;
  groupBy?: string[] | undefined;
  useKqlFilter?: boolean;
  searchConfiguration?: SearchConfigurationType;
}

const TRANSACTION_ALERT_AGGREGATION_TYPES: Record<AggregationType, string> = {
  [AggregationType.Avg]: i18n.translate('xpack.apm.transactionDurationAlert.aggregationType.avg', {
    defaultMessage: 'Average',
  }),
  [AggregationType.P95]: i18n.translate('xpack.apm.transactionDurationAlert.aggregationType.95th', {
    defaultMessage: '95th percentile',
  }),
  [AggregationType.P99]: i18n.translate('xpack.apm.transactionDurationAlert.aggregationType.99th', {
    defaultMessage: '99th percentile',
  }),
};

interface Props {
  ruleParams: TransactionDurationRuleParams;
  metadata?: AlertMetadata;
  setRuleParams: (key: string, value: any) => void;
  setRuleProperty: (key: string, value: any) => void;
}

export function TransactionDurationRuleType(props: Props) {
  const { services } = useKibana();
  const { ruleParams, metadata, setRuleParams, setRuleProperty } = props;

  useEffect(() => {
    createCallApmApi(services as CoreStart);
  }, [services]);

  const params = defaults(
    {
      ...omit(metadata, ['start', 'end']),
      ...ruleParams,
    },
    {
      aggregationType: AggregationType.Avg,
      threshold: 1500,
      windowSize: 5,
      windowUnit: TIME_UNITS.MINUTE,
      environment: ENVIRONMENT_ALL.value,
    }
  );

  const { data, status } = useFetcher(
    (callApmApi) => {
      const { interval, start, end } = getIntervalAndTimeRange({
        windowSize: params.windowSize,
        windowUnit: params.windowUnit,
      });
      if (params.windowSize && start && end) {
        return callApmApi('GET /internal/apm/rule_types/transaction_duration/chart_preview', {
          params: {
            query: {
              aggregationType: params.aggregationType,
              environment: params.environment,
              serviceName: params.serviceName,
              transactionType: params.transactionType,
              transactionName: params.transactionName,
              interval,
              start,
              end,
              groupBy: params.groupBy,
              searchConfiguration: params.searchConfiguration?.query?.query
                ? JSON.stringify(params.searchConfiguration)
                : undefined,
            },
          },
        });
      }
    },
    [
      params.aggregationType,
      params.environment,
      params.serviceName,
      params.transactionType,
      params.transactionName,
      params.windowSize,
      params.windowUnit,
      params.groupBy,
      params.searchConfiguration,
    ]
  );

  const latencyChartPreview = data?.latencyChartPreview;
  const series = latencyChartPreview?.series ?? [];
  const hasData = series.length > 0;
  const totalGroups = latencyChartPreview?.totalGroups ?? 0;

  const maxY = getMaxY(series);
  const formatter = getDurationFormatter(maxY);
  const yTickFormat = getResponseTimeTickFormatter(formatter);

  // The threshold from the form is in ms. Convert to µs.
  const thresholdMs = params.threshold * 1000;

  const chartPreview = isPending(status) ? (
    <LoadingState />
  ) : !hasData ? (
    <NoDataState />
  ) : status === FETCH_STATUS.SUCCESS ? (
    <ChartPreview
      series={series}
      threshold={thresholdMs}
      yTickFormat={yTickFormat}
      uiSettings={services.uiSettings}
      timeSize={params.windowSize}
      timeUnit={params.windowUnit}
      totalGroups={totalGroups}
    />
  ) : (
    <ErrorState />
  );

  const onGroupByChange = useCallback(
    (group: string[] | null) => {
      setRuleParams('groupBy', group ?? []);
    },
    [setRuleParams]
  );

  const filterFields = [
    <ServiceField
      allowAll={false}
      currentValue={params.serviceName}
      onChange={(value) => {
        if (value !== params.serviceName) {
          setRuleParams('serviceName', value);
          setRuleParams('transactionType', undefined);
          setRuleParams('transactionName', undefined);
          setRuleParams('environment', ENVIRONMENT_ALL.value);
        }
      }}
    />,
    <TransactionTypeField
      currentValue={params.transactionType}
      onChange={(value) => setRuleParams('transactionType', value)}
      serviceName={params.serviceName}
    />,
    <EnvironmentField
      currentValue={params.environment}
      onChange={(value) =>
        setRuleParams('environment', value !== '' ? value : ENVIRONMENT_ALL.value)
      }
      serviceName={params.serviceName}
    />,
    <TransactionNameField
      currentValue={params.transactionName}
      onChange={(value) => setRuleParams('transactionName', value)}
      serviceName={params.serviceName}
    />,
  ];

  const criteriaFields = [
    <PopoverExpression
      value={params.aggregationType}
      title={i18n.translate('xpack.apm.transactionDurationRuleType.when', {
        defaultMessage: 'When',
      })}
    >
      <EuiSelect
        data-test-subj="apmTransactionDurationRuleTypeSelect"
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
      unit={i18n.translate('xpack.apm.transactionDurationRuleType.ms', {
        defaultMessage: 'ms',
      })}
      onChange={(value) => setRuleParams('threshold', value || 0)}
    />,
    <ForLastExpression
      onChangeWindowSize={(timeWindowSize) => setRuleParams('windowSize', timeWindowSize || '')}
      onChangeWindowUnit={(timeWindowUnit) => setRuleParams('windowUnit', timeWindowUnit)}
      timeWindowSize={params.windowSize}
      timeWindowUnit={params.windowUnit}
      errors={{
        timeWindowSize: [],
        timeWindowUnit: [],
      }}
    />,
  ];

  const fields = [...(!ruleParams.useKqlFilter ? filterFields : []), ...criteriaFields];

  const groupAlertsBy = (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.apm.ruleFlyout.transactionDuration.createAlertPerText', {
          defaultMessage: 'Group alerts by',
        })}
        helpText={i18n.translate(
          'xpack.apm.ruleFlyout.transactionDuration.createAlertPerHelpText',
          {
            defaultMessage:
              'Create an alert for every unique value. For example: "transaction.name". By default, alert is created for every unique service.name, service.environment and transaction.type.',
          }
        )}
        fullWidth
        display="rowCompressed"
      >
        <APMRuleGroupBy
          onChange={onGroupByChange}
          options={{ groupBy: ruleParams.groupBy }}
          fields={[TRANSACTION_NAME]}
          preSelectedOptions={[SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </>
  );

  const onToggleKqlFilter = (e: EuiSwitchEvent) => {
    setRuleParams('serviceName', undefined);
    setRuleParams('transactionType', undefined);
    setRuleParams('transactionName', undefined);
    setRuleParams('environment', ENVIRONMENT_ALL.value);
    setRuleParams('searchConfiguration', {
      query: { query: '', language: 'kuery' },
    });
    setRuleParams('useKqlFilter', e.target.checked);
  };

  const kqlFilter = (
    <>
      <ApmRuleKqlFilter
        ruleParams={ruleParams}
        setRuleParams={setRuleParams}
        onToggleKqlFilter={onToggleKqlFilter}
      />
    </>
  );

  return (
    <ApmRuleParamsContainer
      minimumWindowSize={{ value: 5, unit: TIME_UNITS.MINUTE }}
      chartPreview={chartPreview}
      defaultParams={params}
      fields={fields}
      groupAlertsBy={groupAlertsBy}
      kqlFilter={kqlFilter}
      setRuleParams={setRuleParams}
      setRuleProperty={setRuleProperty}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default TransactionDurationRuleType;
