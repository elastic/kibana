/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { RuleActionFrequency, RuleAction } from '@kbn/alerting-plugin/common';
import type { ActionType, AsApiContract } from '@kbn/actions-plugin/common';
import type { ActionResult } from '@kbn/actions-plugin/server';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  useFetchConnectors,
  useFetchConnectorTypes,
} from '../../../../detection_engine/rule_management/api/hooks/use_fetch_connectors';
import { useKibana } from '../../../../common/lib/kibana';
import type { ActionsStepRule } from '../../../pages/detection_engine/rules/types';
import { getActionDetails } from '../../../../detection_engine/rule_response_actions/constants';
import * as i18n from './translations';

const DescriptionLine = ({ children }: { children: React.ReactNode }) => (
  <EuiFlexItem>
    <EuiText size="xs" color="subdued">
      {children}
    </EuiText>
  </EuiFlexItem>
);

export const FrequencyDescription: React.FC<{ frequency?: RuleActionFrequency }> = ({
  frequency,
}) => {
  if (!frequency) {
    return null;
  }

  if (!frequency.summary) {
    return <DescriptionLine>{i18n.FOR_EACH_ALERT_PER_RULE_RUN}</DescriptionLine>;
  }

  if (frequency.notifyWhen === 'onActiveAlert') {
    return <DescriptionLine>{i18n.SUMMARY_OF_ALERTS_PER_RULE_RUN}</DescriptionLine>;
  }

  if (!frequency.throttle) {
    return null;
  }

  const value = frequency.throttle.slice(0, frequency.throttle.length - 1);
  const unit = frequency.throttle.charAt(frequency.throttle.length - 1);

  const messagesByUnit: { [unit: string]: JSX.Element } = {
    s: (
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.ruleDetails.onceInEverySecondsLabel"
        defaultMessage="Once {secondsCount, plural, one {a} other {in every}} {secondsCount, plural, one {second} other {# seconds}}"
        values={{ secondsCount: value }}
      />
    ),
    m: (
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.ruleDetails.onceInEveryMinutesLabel"
        defaultMessage="Once {minutesCount, plural, one {a} other {in every}} {minutesCount, plural, one {minute} other {# minutes}}"
        values={{ minutesCount: value }}
      />
    ),
    h: (
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.ruleDetails.onceInEveryHoursLabel"
        defaultMessage="Once {hoursCount, plural, one {an} other {in every}} {hoursCount, plural, one {hour} other {# hours}}"
        values={{ hoursCount: value }}
      />
    ),
    d: (
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.ruleDetails.onceInEveryDaysLabel"
        defaultMessage="Once {daysCount, plural, one {a} other {in every}} {daysCount, plural, one {day} other {# days}}"
        values={{ daysCount: value }}
      />
    ),
  };

  return <DescriptionLine>{messagesByUnit[unit] || i18n.PERIODICALLY}</DescriptionLine>;
};

export const StepActionsRule: React.FC<{ ruleActionsData: ActionsStepRule }> = ({
  ruleActionsData,
}) => {
  const {
    services: { triggersActionsUi },
  } = useKibana();

  const actionTypeRegistry = triggersActionsUi.actionTypeRegistry as ActionTypeRegistryContract;

  const { data: connectors, isLoading } = useFetchConnectors();
  const { data: connectorTypes } = useFetchConnectorTypes();

  if (isLoading || !connectors || !connectorTypes || !ruleActionsData) {
    return null;
  }

  const notificationActions = ruleActionsData.actions;
  const responseActions = ruleActionsData.responseActions || [];

  const hasBothNotificationAndResponseActions =
    notificationActions.length > 0 && responseActions.length > 0;

  return (
    <div>
      {hasBothNotificationAndResponseActions && (
        <EuiText size="m">{i18n.NOTIFICATION_ACTIONS}</EuiText>
      )}
      <EuiSpacer size="s" />
      {notificationActions.map((action) => (
        <NotificationAction
          action={action}
          connectorTypes={connectorTypes}
          connectors={connectors}
          actionTypeRegistry={actionTypeRegistry}
          key={action.id}
        />
      ))}
      <EuiSpacer size="m" />

      {hasBothNotificationAndResponseActions && <EuiText size="m">{i18n.RESPONSE_ACTIONS}</EuiText>}
      <EuiSpacer size="s" />
      {responseActions.map((action, index) => (
        <ResponseAction action={action} key={`${action.actionTypeId}-${index}`} />
      ))}
    </div>
  );
};

interface NotificationActionProps {
  action: RuleAction;
  connectorTypes: ActionType[];
  connectors: Array<AsApiContract<ActionResult>>;
  actionTypeRegistry: ActionTypeRegistryContract;
}

function NotificationAction({
  action,
  connectorTypes,
  connectors,
  actionTypeRegistry,
}: NotificationActionProps) {
  const connectorType = connectorTypes.find(({ id }) => id === action.actionTypeId);
  const connectorTypeName = connectorType?.name ?? '';

  const connector = connectors.find(({ id }) => id === action.id);
  const connectorName = connector?.name ?? '';

  const iconType = actionTypeRegistry.get(action.actionTypeId)?.iconClass ?? 'apps';

  return (
    <EuiFlexItem>
      <EuiFlexGroup alignItems="center" gutterSize="s" component="span" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={connectorTypeName} anchorClassName="eui-textTruncate">
            <EuiIcon size="m" type={iconType} />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{connectorName}</EuiText>
          <EuiFlexGroup alignItems="center" gutterSize="xs" component="span" responsive={false}>
            <EuiSpacer size="xs" />
            <EuiFlexItem grow={false}>
              <EuiIcon size="s" type="bell" color="subdued" />
            </EuiFlexItem>
            <FrequencyDescription frequency={action.frequency} />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
    </EuiFlexItem>
  );
}

interface ResponseActionProps {
  action: Omit<RuleAction, 'id' | 'group'>;
}

function ResponseAction({ action }: ResponseActionProps) {
  const { name, logo } = getActionDetails(action.actionTypeId);

  return (
    <EuiFlexItem>
      <EuiFlexGroup alignItems="center" gutterSize="s" component="span" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={name} anchorClassName="eui-textTruncate">
            <EuiIcon size="m" type={logo} />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{name}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
    </EuiFlexItem>
  );
}
