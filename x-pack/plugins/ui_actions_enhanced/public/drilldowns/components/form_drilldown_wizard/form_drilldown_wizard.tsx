/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFieldText, EuiForm, EuiFormRow, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import { txtDrilldownAction, txtNameOfDrilldown, txtUntitledDrilldown } from './i18n';
import {
  ActionFactory,
  BaseActionConfig,
  BaseActionFactoryContext,
} from '../../../dynamic_actions';
import { ActionWizard } from '../../../components/action_wizard';
import { Trigger, TriggerId } from '../../../../../../../src/plugins/ui_actions/public';
import { txtGetMoreActions } from './i18n';

const GET_MORE_ACTIONS_LINK = 'https://www.elastic.co/subscriptions';

const noopFn = () => {};

export interface FormDrilldownWizardProps<
  ActionFactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
> {
  name?: string;
  onNameChange?: (name: string) => void;

  currentActionFactory?: ActionFactory;
  onActionFactoryChange?: (actionFactory?: ActionFactory) => void;
  actionFactoryContext: ActionFactoryContext;

  actionConfig?: BaseActionConfig;
  onActionConfigChange?: (config: BaseActionConfig) => void;

  actionFactories?: ActionFactory[];

  /**
   * Trigger selection has changed
   * @param triggers
   */
  onSelectedTriggersChange: (triggers?: TriggerId[]) => void;

  getTriggerInfo: (triggerId: TriggerId) => Trigger;

  /**
   * List of possible triggers in current context
   */
  triggers: TriggerId[];

  triggerPickerDocsLink?: string;
}

export const FormDrilldownWizard: React.FC<FormDrilldownWizardProps> = ({
  name = '',
  actionConfig,
  currentActionFactory,
  onNameChange = noopFn,
  onActionConfigChange = noopFn,
  onActionFactoryChange = noopFn,
  actionFactories = [],
  actionFactoryContext,
  onSelectedTriggersChange,
  getTriggerInfo,
  triggers,
  triggerPickerDocsLink,
}) => {
  if (!triggers || !triggers.length) {
    // Below callout is not translated, because this message is only for developers.
    return (
      <EuiCallOut title="Sorry, there was an error" color="danger" iconType="alert">
        <p>
          No triggers provided in <EuiCode>trigger</EuiCode> prop.
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
        disabled={onNameChange === noopFn}
        onChange={(event) => onNameChange(event.target.value)}
        data-test-subj="drilldownNameInput"
      />
    </EuiFormRow>
  );

  const hasNotCompatibleLicenseFactory = () =>
    actionFactories?.some((f) => !f.isCompatibleLicense());

  const renderGetMoreActionsLink = () => (
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
  );

  const actionWizard = (
    <EuiFormRow
      label={actionFactories?.length > 1 ? txtDrilldownAction : undefined}
      fullWidth={true}
      labelAppend={
        !currentActionFactory && hasNotCompatibleLicenseFactory() && renderGetMoreActionsLink()
      }
    >
      <ActionWizard
        actionFactories={actionFactories}
        currentActionFactory={currentActionFactory}
        config={actionConfig}
        onActionFactoryChange={(actionFactory) => onActionFactoryChange(actionFactory)}
        onConfigChange={(config) => onActionConfigChange(config)}
        context={actionFactoryContext}
        onSelectedTriggersChange={onSelectedTriggersChange}
        getTriggerInfo={getTriggerInfo}
        triggers={triggers}
        triggerPickerDocsLink={triggerPickerDocsLink}
      />
    </EuiFormRow>
  );

  return (
    <>
      <EuiForm>
        {nameFragment}
        <EuiSpacer size={'xl'} />
        {actionWizard}
      </EuiForm>
    </>
  );
};
