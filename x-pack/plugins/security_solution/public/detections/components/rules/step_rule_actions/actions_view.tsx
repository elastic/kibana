/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import type { RuleActionFrequency } from '@kbn/alerting-plugin/common';
import {
  useFetchConnectors,
  useFetchConnectorTypes,
} from '../../../../detection_engine/rule_management/api/hooks/use_fetch_connectors';
import { useKibana } from '../../../../common/lib/kibana';
import type { ActionsStepRule, RuleAction } from '../../../pages/detection_engine/rules/types';

const FOR_EACH_ALERT = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.actionNotifyWhen.forEachOption',
  { defaultMessage: 'For each alert' }
);
const SUMMARY_OF_ALERTS = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.actionNotifyWhen.summaryOption',
  { defaultMessage: 'Summary of alerts' }
);

const getFrequencyText = (frequency: RuleActionFrequency) => {
  if (!frequency.summary) {
    return FOR_EACH_ALERT; // For each alert, per rule run
  }

  if (frequency.notifyWhen === 'onActiveAlert') {
    return `${SUMMARY_OF_ALERTS}, for every rule run`; // Summary of alerts, per rule run
  }

  const value = frequency.throttle.slice(0, frequency.throttle.length - 1);
  const unit = frequency.throttle.charAt(frequency.throttle.length - 1);
  const unitText =
    unit === 's' ? 'seconds' : unit === 'm' ? 'minutes' : unit === 'h' ? 'hours' : 'days';

  let throttleText = '';

  if (frequency.throttle === '1d') {
    throttleText = 'once a day';
  } else if (frequency.throttle === '1h') {
    throttleText = 'once an hour';
  } else if (frequency.throttle === '1m') {
    throttleText = 'once a minute';
  } else if (frequency.throttle === '1s') {
    throttleText = 'once a second';
  } else {
    throttleText = `once in every ${value} ${unitText}`;
  }

  return `${SUMMARY_OF_ALERTS}, ${throttleText}`;
};

export const StepActionsRule: React.FC<{ ruleActionsData: ActionsStepRule }> = ({
  ruleActionsData,
}) => {
  const {
    services: {
      triggersActionsUi: { actionTypeRegistry },
    },
  } = useKibana();

  const { data: connectors, isLoading } = useFetchConnectors();

  const connectorTypesResult = useFetchConnectorTypes();

  if (!ruleActionsData || !connectors || isLoading || !connectorTypesResult.data) {
    return null;
  }

  console.log({ connectorTypesResult, responseActions: ruleActionsData.responseActions });

  return (
    <div>
      {/* <div>Notification actions</div> */}
      {ruleActionsData.actions.map((action) => (
        <NotificationAction
          action={action}
          connectorTypesResult={connectorTypesResult}
          connectors={connectors}
          actionTypeRegistry={actionTypeRegistry}
        />
      ))}
      {/* <div>Response actions</div>
      {(ruleActionsData.responseActions || []).map((action) => (
        <ResponseAction
          action={action}
          connectorTypesResult={connectorTypesResult}
          connectors={connectors}
          actionTypeRegistry={actionTypeRegistry}
        />
      ))} */}
    </div>
  );
};

function NotificationAction({
  action,
  connectorTypesResult,
  connectors,
  actionTypeRegistry,
}: {
  action: RuleAction;
}) {
  const connectorType = connectorTypesResult.data.find(({ id }) => id === action.actionTypeId).name;
  const connectorName = connectors.find(({ id }) => id === action.id).name;

  return (
    <div style={{ display: 'flex', marginBottom: '16px', alignItems: 'center' }}>
      <div>
        <EuiToolTip
          // data-test-subj={`${ruleName}-tooltip`}
          // title={'title'}
          content={connectorType}
          anchorClassName="eui-textTruncate"
        >
          <EuiIcon size="m" type={actionTypeRegistry.get(action.actionTypeId)?.iconClass} />
        </EuiToolTip>
      </div>

      <div style={{ marginLeft: '12px' }}>
        <div>{connectorName}</div>
        <div style={{ color: '#69707d', fontSize: '12px' }}>
          {getFrequencyText(action.frequency)}
        </div>
      </div>
    </div>
  );
}

function ResponseAction({
  action,
  connectorTypesResult,
  connectors,
  actionTypeRegistry,
}: {
  action: RuleAction;
}) {
  const connectorType = connectorTypesResult.data.find(({ id }) => id === action.actionTypeId).name;
  const connectorName = connectors.find(({ id }) => id === action.id).name;

  return (
    <div>
      <div>
        <EuiToolTip
          // data-test-subj={`${ruleName}-tooltip`}
          // title={'title'}
          content={connectorType}
          anchorClassName="eui-textTruncate"
        >
          <EuiIcon size="m" type={actionTypeRegistry.get(action.actionTypeId)?.iconClass} />
        </EuiToolTip>
      </div>
    </div>
  );
}

// type={
//   typeof item.iconClass === 'string'
//     ? item.iconClass
//     : suspendedComponentWithProps(item.iconClass as React.ComponentType)
// }
