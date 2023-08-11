/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { defaults, omit } from 'lodash';
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
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { asInteger } from '../../../../../common/utils/formatters';
import {
  FETCH_STATUS,
  isPending,
  useFetcher,
} from '../../../../hooks/use_fetcher';
import { createCallApmApi } from '../../../../services/rest/create_call_apm_api';
import { ChartPreview } from '../../ui_components/chart_preview';
import {
  EnvironmentField,
  ErrorGroupingKeyField,
  IsAboveField,
  ServiceField,
} from '../../utils/fields';
import { AlertMetadata, getIntervalAndTimeRange } from '../../utils/helper';
import { ApmRuleParamsContainer } from '../../ui_components/apm_rule_params_container';
import { APMRuleGroupBy } from '../../ui_components/apm_rule_group_by';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  ERROR_GROUP_ID,
  ERROR_GROUP_NAME,
} from '../../../../../common/es_fields/apm';
import {
  ErrorState,
  LoadingState,
  NoDataState,
} from '../../ui_components/chart_preview/chart_preview_helper';
import { ApmRuleKqlFilter } from '../../ui_components/apm_rule_kql_filter';

export interface ErrorCountRuleParams {
  windowSize?: number;
  windowUnit?: TIME_UNITS;
  threshold?: number;
  serviceName?: string;
  environment?: string;
  groupBy?: string[] | undefined;
  errorGroupingKey?: string;
  useKqlFilter?: boolean;
  kqlFilter?: string;
}

interface Props {
  ruleParams: ErrorCountRuleParams;
  metadata?: AlertMetadata;
  setRuleParams: (key: string, value: any) => void;
  setRuleProperty: (key: string, value: any) => void;
}

export function ErrorCountRuleType(props: Props) {
  const { services } = useKibana();
  const { ruleParams, metadata, setRuleParams, setRuleProperty } = props;

  useEffect(() => {
    createCallApmApi(services as CoreStart);
  }, [services]);

  const params = defaults(
    { ...omit(metadata, ['start', 'end']), ...ruleParams },
    {
      threshold: 25,
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
          'GET /internal/apm/rule_types/error_count/chart_preview',
          {
            params: {
              query: {
                environment: params.environment,
                serviceName: params.serviceName,
                errorGroupingKey: params.errorGroupingKey,
                interval,
                start,
                end,
                groupBy: params.groupBy,
                kqlFilter: params.kqlFilter,
              },
            },
          }
        );
      }
    },
    [
      params.windowSize,
      params.windowUnit,
      params.environment,
      params.serviceName,
      params.errorGroupingKey,
      params.groupBy,
      params.kqlFilter,
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
          setRuleParams('environment', ENVIRONMENT_ALL.value);
          setRuleParams('errorGroupingKey', undefined);
        }
      }}
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
    <ErrorGroupingKeyField
      currentValue={params.errorGroupingKey}
      onChange={(value) => setRuleParams('errorGroupingKey', value)}
      serviceName={params.serviceName}
    />,
  ];

  const criteriaFields = [
    <IsAboveField
      value={params.threshold}
      unit={i18n.translate('xpack.apm.errorCountRuleType.errors', {
        defaultMessage: ' errors',
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

  const fields = [
    ...(!ruleParams.useKqlFilter ? filterFields : []),
    ...criteriaFields,
  ];

  const errorCountChartPreview = data?.errorCountChartPreview;
  const series = errorCountChartPreview?.series ?? [];
  const hasData = series.length > 0;
  const totalGroups = errorCountChartPreview?.totalGroups ?? 0;

  const chartPreview = isPending(status) ? (
    <LoadingState />
  ) : !hasData ? (
    <NoDataState />
  ) : status === FETCH_STATUS.SUCCESS ? (
    <ChartPreview
      series={series}
      threshold={params.threshold}
      yTickFormat={asInteger}
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
          'xpack.apm.ruleFlyout.errorCount.createAlertPerText',
          {
            defaultMessage: 'Group alerts by',
          }
        )}
        helpText={i18n.translate(
          'xpack.apm.ruleFlyout.errorCount.createAlertPerHelpText',
          {
            defaultMessage:
              'Create an alert for every unique value. For example: "transaction.name". By default, alert is created for every unique service.name and service.environment.',
          }
        )}
        fullWidth
        display="rowCompressed"
      >
        <APMRuleGroupBy
          onChange={onGroupByChange}
          options={{ groupBy: ruleParams.groupBy }}
          fields={[TRANSACTION_NAME, ERROR_GROUP_ID, ERROR_GROUP_NAME]}
          preSelectedOptions={[SERVICE_NAME, SERVICE_ENVIRONMENT]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </>
  );

  const onToggleKqlFilter = (e: EuiSwitchEvent) => {
    setRuleParams('serviceName', undefined);
    setRuleParams('errorGroupingKey', undefined);
    setRuleParams('environment', ENVIRONMENT_ALL.value);
    setRuleParams('kqlFilter', undefined);
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
      defaultParams={params}
      fields={fields}
      groupAlertsBy={groupAlertsBy}
      kqlFilter={kqlFilter}
      setRuleParams={setRuleParams}
      setRuleProperty={setRuleProperty}
      chartPreview={chartPreview}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default ErrorCountRuleType;
