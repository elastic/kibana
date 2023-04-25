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
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { asInteger } from '../../../../../common/utils/formatters';
import { useFetcher } from '../../../../hooks/use_fetcher';
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
} from '../../../../../common/es_fields/apm';

export interface RuleParams {
  windowSize?: number;
  windowUnit?: TIME_UNITS;
  threshold?: number;
  serviceName?: string;
  environment?: string;
  groupBy?: string[] | undefined;
  errorGroupingKey?: string;
}

interface Props {
  ruleParams: RuleParams;
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

  const { data } = useFetcher(
    (callApmApi) => {
      const { interval, start, end } = getIntervalAndTimeRange({
        windowSize: params.windowSize,
        windowUnit: params.windowUnit,
      });
      if (interval && start && end) {
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
    ]
  );

  const onGroupByChange = useCallback(
    (group: string[] | null) => {
      setRuleParams('groupBy', group ?? []);
    },
    [setRuleParams]
  );

  const fields = [
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
      onChange={(value) => setRuleParams('environment', value)}
      serviceName={params.serviceName}
    />,
    <ErrorGroupingKeyField
      currentValue={params.errorGroupingKey}
      onChange={(value) => setRuleParams('errorGroupingKey', value)}
      serviceName={params.serviceName}
    />,

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

  const chartPreview = (
    <ChartPreview
      series={[{ data: data?.errorCountChartPreview ?? [] }]}
      threshold={params.threshold}
      yTickFormat={asInteger}
      uiSettings={services.uiSettings}
    />
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
          fields={[TRANSACTION_NAME, ERROR_GROUP_ID]}
          preSelectedOptions={[SERVICE_NAME, SERVICE_ENVIRONMENT]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </>
  );

  return (
    <ApmRuleParamsContainer
      minimumWindowSize={{ value: 5, unit: TIME_UNITS.MINUTE }}
      defaultParams={params}
      fields={fields}
      groupAlertsBy={groupAlertsBy}
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
