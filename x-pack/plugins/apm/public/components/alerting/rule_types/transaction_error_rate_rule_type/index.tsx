/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaults, omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect } from 'react';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  ForLastExpression,
  TIME_UNITS,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiSwitchEvent } from '@elastic/eui';
import { SearchConfigurationType } from '../../../../../common/rules/schema';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { asPercent } from '../../../../../common/utils/formatters';
import {
  FETCH_STATUS,
  isPending,
  useFetcher,
} from '../../../../hooks/use_fetcher';
import { createCallApmApi } from '../../../../services/rest/create_call_apm_api';
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
import { APMRuleGroupBy } from '../../ui_components/apm_rule_group_by';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
} from '../../../../../common/es_fields/apm';
import {
  ErrorState,
  LoadingState,
  NoDataState,
} from '../../ui_components/chart_preview/chart_preview_helper';
import { ApmRuleKqlFilter } from '../../ui_components/apm_rule_kql_filter';

export interface ErrorRateRuleParams {
  windowSize?: number;
  windowUnit?: string;
  threshold?: number;
  serviceName?: string;
  transactionType?: string;
  transactionName?: string;
  environment?: string;
  groupBy?: string[] | undefined;
  useKqlFilter?: boolean;
  searchConfiguration?: SearchConfigurationType;
}

export interface Props {
  ruleParams: ErrorRateRuleParams;
  metadata?: AlertMetadata;
  setRuleParams: (key: string, value: any) => void;
  setRuleProperty: (key: string, value: any) => void;
}

export function TransactionErrorRateRuleType(props: Props) {
  const { services } = useKibana();
  const { ruleParams, metadata, setRuleParams, setRuleProperty } = props;

  useEffect(() => {
    createCallApmApi(services as CoreStart);
  }, [services]);

  const params = defaults(
    { ...omit(metadata, ['start', 'end']), ...ruleParams },
    {
      threshold: 30,
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
        return callApmApi(
          'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
          {
            params: {
              query: {
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
          }
        );
      }
    },
    [
      params.transactionType,
      params.transactionName,
      params.environment,
      params.serviceName,
      params.windowSize,
      params.windowUnit,
      params.groupBy,
      params.searchConfiguration,
    ]
  );

  const onGroupByChange = useCallback(
    (group: string[] | null) => {
      setRuleParams('groupBy', group ?? []);
    },
    [setRuleParams]
  );

  const filterFields = [
    <ServiceField
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
        setRuleParams(
          'environment',
          value !== '' ? value : ENVIRONMENT_ALL.value
        )
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
    <IsAboveField
      value={params.threshold}
      unit="%"
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

  const fields = [
    ...(!ruleParams.useKqlFilter ? filterFields : []),
    ...criteriaFields,
  ];

  const errorRateChartPreview = data?.errorRateChartPreview;
  const series = errorRateChartPreview?.series ?? [];
  const hasData = series.length > 0;
  const totalGroups = errorRateChartPreview?.totalGroups ?? 0;

  const chartPreview = isPending(status) ? (
    <LoadingState />
  ) : !hasData ? (
    <NoDataState />
  ) : status === FETCH_STATUS.SUCCESS ? (
    <ChartPreview
      series={series}
      yTickFormat={(d: number | null) => asPercent(d, 100)}
      threshold={params.threshold}
      uiSettings={services.uiSettings}
      timeSize={params.windowSize}
      timeUnit={params.windowUnit}
      totalGroups={totalGroups}
    />
  ) : (
    <ErrorState />
  );

  const groupAlertsBy = (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.apm.ruleFlyout.errorRate.createAlertPerText',
          {
            defaultMessage: 'Group alerts by',
          }
        )}
        helpText={i18n.translate(
          'xpack.apm.ruleFlyout.errorRate.createAlertPerHelpText',
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
          preSelectedOptions={[
            SERVICE_NAME,
            SERVICE_ENVIRONMENT,
            TRANSACTION_TYPE,
          ]}
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
      fields={fields}
      groupAlertsBy={groupAlertsBy}
      kqlFilter={kqlFilter}
      defaultParams={params}
      setRuleParams={setRuleParams}
      setRuleProperty={setRuleProperty}
      chartPreview={chartPreview}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default TransactionErrorRateRuleType;
