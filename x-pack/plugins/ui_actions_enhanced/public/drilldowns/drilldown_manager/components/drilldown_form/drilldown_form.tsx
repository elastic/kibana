/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiCode,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TriggerPicker, TriggerPickerProps } from '../trigger_picker';

const txtNameOfDrilldown = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownForm.nameOfDrilldown',
  {
    defaultMessage: 'Name',
  }
);

const txtUntitledDrilldown = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownForm.untitledDrilldown',
  {
    defaultMessage: 'Untitled drilldown',
  }
);

const txtDrilldownAction = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownForm.drilldownAction',
  {
    defaultMessage: 'Action',
  }
);

const txtTrigger = i18n.translate('xpack.uiActionsEnhanced.components.DrilldownForm.trigger', {
  defaultMessage: 'Trigger',
});

const txtConfig = i18n.translate('xpack.uiActionsEnhanced.components.DrilldownForm.configuration', {
  defaultMessage: 'Configuration',
});

const txtGetMoreActions = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownForm.getMoreActionsLinkLabel',
  {
    defaultMessage: 'Get more actions',
  }
);

const txtBetaActionFactoryLabel = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownForm.betaActionLabel',
  {
    defaultMessage: `Beta`,
  }
);

const txtBetaActionFactoryTooltip = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownForm.betaActionTooltip',
  {
    defaultMessage: `This action is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features. Please help us by reporting any bugs or providing other feedback.`,
  }
);

const txtChangeButton = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownForm.changeButton',
  {
    defaultMessage: 'Change',
  }
);

const GET_MORE_ACTIONS_LINK = 'https://www.elastic.co/subscriptions';
export interface FormDrilldownWizardProps {
  /** Value of name field. */
  name?: string;

  /** Callback called on name change. */
  onNameChange?: (name: string) => void;

  /** ID of EUI icon. */
  euiIconType?: string;

  /** Name of the drilldown type. */
  drilldownTypeName: string;

  /** Whether the current drilldown type is in beta. */
  isBeta?: boolean;

  /** Whether to show "Get more actions" link to upgrade license. */
  showMoreActionsLink?: boolean;

  /** On drilldown type change click. */
  onTypeChange: () => void;

  /** Trigger picker props. */
  triggers?: TriggerPickerProps;
}

export const DrilldownForm: React.FC<FormDrilldownWizardProps> = ({
  isBeta,
  name = '',
  euiIconType,
  drilldownTypeName,
  showMoreActionsLink,
  onNameChange,
  onTypeChange,
  triggers,
  children,
}) => {
  if (!!triggers && !triggers.items.length) {
    // Below callout is not translated, because this message is only for developers.
    return (
      <EuiCallOut title="Sorry, there was an error" color="danger" iconType="alert">
        <p>
          No triggers provided in <EuiCode>triggers</EuiCode> prop.
        </p>
      </EuiCallOut>
    );
  }

  const nameFragment = (
    <EuiFormRow label={txtNameOfDrilldown}>
      <EuiFieldText
        name="drilldown_name"
        placeholder={txtUntitledDrilldown}
        value={name}
        disabled={!onNameChange}
        onChange={!!onNameChange ? (event) => onNameChange(event.target.value) : undefined}
        data-test-subj="drilldownNameInput"
      />
    </EuiFormRow>
  );

  const icon = euiIconType && (
    <EuiFlexItem grow={false}>
      <EuiIcon type={euiIconType} size="m" />
    </EuiFlexItem>
  );

  const drilldownTypeInfo = (
    <EuiFormRow
      label={txtDrilldownAction}
      fullWidth={true}
      labelAppend={
        showMoreActionsLink && (
          <EuiText size="s">
            <EuiLink
              href={GET_MORE_ACTIONS_LINK}
              target="_blank"
              external
              data-test-subj={'getMoreActionsLink'}
            >
              {txtGetMoreActions}
            </EuiLink>
          </EuiText>
        )
      }
    >
      <header>
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
          {icon}
          <EuiFlexItem grow={true}>
            <EuiText>
              <h4>
                {drilldownTypeName}{' '}
                {isBeta && (
                  <EuiBetaBadge
                    label={txtBetaActionFactoryLabel}
                    tooltipContent={txtBetaActionFactoryTooltip}
                  />
                )}
              </h4>
            </EuiText>
          </EuiFlexItem>
          {!!onTypeChange && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" onClick={onTypeChange}>
                {txtChangeButton}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </header>
    </EuiFormRow>
  );

  const triggersFragment = !!triggers && triggers.items.length > 1 && (
    <EuiFormRow label={txtTrigger} fullWidth={true}>
      <TriggerPicker {...triggers} />
    </EuiFormRow>
  );

  const configFragment = (
    <EuiFormRow label={txtConfig} fullWidth={true}>
      <div>{children}</div>
    </EuiFormRow>
  );

  return (
    <EuiForm data-test-subj={`DrilldownForm`}>
      {drilldownTypeInfo}
      <EuiSpacer size={'m'} />
      {nameFragment}
      <EuiSpacer size={'m'} />
      {triggersFragment}
      <EuiSpacer size={'m'} />
      {configFragment}
    </EuiForm>
  );
};
