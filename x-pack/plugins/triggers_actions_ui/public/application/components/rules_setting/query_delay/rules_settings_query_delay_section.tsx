/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  MAX_QUERY_DELAY,
  MIN_QUERY_DELAY,
  RulesSettingsQueryDelayProperties,
} from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
  EuiText,
  EuiEmptyPrompt,
  EuiTitle,
} from '@elastic/eui';
import { RulesSettingsRange } from '../rules_settings_range';

const queryDelayDescription = i18n.translate(
  'xpack.triggersActionsUI.rulesSettings.modal.queryDelayDescription',
  {
    defaultMessage:
      'Delay all rule queries to mitigate the impact of index refresh intervals on data availability.',
  }
);

const queryDelayLabel = i18n.translate('xpack.triggersActionsUI.rulesSettings.queryDelayLabel', {
  defaultMessage: 'Query delay length (seconds)',
});

export const RulesSettingsQueryDelayErrorPrompt = memo(() => {
  return (
    <EuiEmptyPrompt
      data-test-subj="rulesSettingsQueryDelayErrorPrompt"
      color="danger"
      iconType="warning"
      title={
        <h4>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.queryDelayErrorPromptTitle"
            defaultMessage="Unable to load your query delay settings"
          />
        </h4>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.queryDelayErrorPromptBody"
            defaultMessage="There was an error loading your query delay settings. Contact your administrator for help"
          />
        </p>
      }
    />
  );
});

export const RulesSettingsQueryDelayTitle = () => {
  return (
    <EuiTitle size="xs">
      <h5>
        <FormattedMessage
          id="xpack.triggersActionsUI.rulesSettings.queryDelayTitle"
          defaultMessage="Query delay"
        />
      </h5>
    </EuiTitle>
  );
};

export interface RulesSettingsQueryDelaySectionProps {
  onChange: (key: keyof RulesSettingsQueryDelayProperties, value: number | boolean) => void;
  settings: RulesSettingsQueryDelayProperties;
  canShow: boolean | Readonly<{ [x: string]: boolean }>;
  canWrite: boolean;
  hasError: boolean;
}

export const RulesSettingsQueryDelaySection = memo((props: RulesSettingsQueryDelaySectionProps) => {
  const { onChange, settings, hasError, canShow, canWrite } = props;

  if (!canShow) {
    return null;
  }
  if (hasError) {
    return <RulesSettingsQueryDelayErrorPrompt />;
  }
  return (
    <EuiForm data-test-subj="rulesSettingsQueryDelaySection">
      <EuiFlexGroup>
        <EuiFlexItem>
          <RulesSettingsQueryDelayTitle />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            <p>{queryDelayDescription}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <RulesSettingsRange
            data-test-subj="queryDelayRangeInput"
            min={MIN_QUERY_DELAY}
            max={MAX_QUERY_DELAY}
            value={settings.delay}
            onChange={(e) => onChange('delay', parseInt(e.currentTarget.value, 10))}
            label={queryDelayLabel}
            disabled={!canWrite}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
});
