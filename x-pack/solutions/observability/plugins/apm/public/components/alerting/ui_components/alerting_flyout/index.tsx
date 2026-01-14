/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { isValidRuleFormPlugins } from '@kbn/response-ops-rule-form/lib';
import { APM_SERVER_FEATURE_ID } from '../../../../../common/rules/apm_rule_types';
import { getInitialAlertValues } from '../../utils/get_initial_alert_values';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { useServiceName } from '../../../../hooks/use_service_name';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { useTimeRange } from '../../../../hooks/use_time_range';

interface Props {
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  ruleType: ApmRuleType | null;
  serviceName?: string;
}

export function AlertingFlyout(props: Props) {
  const {
    addFlyoutVisible,
    setAddFlyoutVisibility,
    ruleType,
    serviceName: serviceNameProp,
  } = props;

  const serviceNameFromUrl = useServiceName();
  const serviceName = serviceNameProp ?? serviceNameFromUrl;
  const { query, path } = useApmParams('/*');

  const rangeFrom = 'rangeFrom' in query ? query.rangeFrom : undefined;
  const rangeTo = 'rangeTo' in query ? query.rangeTo : undefined;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo, optional: true });

  const environment = 'environment' in query ? query.environment! : ENVIRONMENT_ALL.value;
  const transactionType = 'transactionType' in query ? query.transactionType : undefined;
  const transactionName = 'transactionName' in query ? query.transactionName : undefined;
  const errorGroupingKey = 'groupId' in path ? path.groupId : undefined;

  const {
    services: {
      triggersActionsUi: { ruleTypeRegistry, actionTypeRegistry },
      ...services
    },
  } = useKibana<CoreStart & ApmPluginStartDeps>();
  const initialValues = getInitialAlertValues(ruleType, serviceName);

  const onCloseAddFlyout = useCallback(
    () => setAddFlyoutVisibility(false),
    [setAddFlyoutVisibility]
  );

  const addAlertFlyout = useMemo(
    () =>
      ruleType &&
      isValidRuleFormPlugins(services) && (
        <RuleFormFlyout
          plugins={{ ...services, ruleTypeRegistry, actionTypeRegistry }}
          consumer={APM_SERVER_FEATURE_ID}
          onCancel={onCloseAddFlyout}
          onSubmit={onCloseAddFlyout}
          ruleTypeId={ruleType}
          initialValues={initialValues}
          initialMetadata={{
            environment,
            serviceName,
            ...(ruleType === ApmRuleType.ErrorCount ? {} : { transactionType }),
            transactionName,
            errorGroupingKey,
            start,
            end,
          }}
          shouldUseRuleProducer
        />
      ),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [
      ruleType,
      environment,
      onCloseAddFlyout,
      ruleTypeRegistry,
      actionTypeRegistry,
      serviceName,
      transactionName,
      errorGroupingKey,
      transactionType,
      environment,
      start,
      end,
    ]
  );
  return <>{addFlyoutVisible && addAlertFlyout}</>;
}
