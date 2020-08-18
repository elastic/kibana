/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFieldText, EuiForm, EuiFormRow, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { txtDrilldownAction, txtNameOfDrilldown, txtUntitledDrilldown } from './i18n';
import { ActionFactory, BaseActionFactoryContext } from '../../../dynamic_actions';
import { ActionWizard } from '../../../components/action_wizard';
import { Trigger, TriggerId } from '../../../../../../../src/plugins/ui_actions/public';

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

  actionConfig?: object;
  onActionConfigChange?: (config: object) => void;

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
  supportedTriggers: TriggerId[];

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
  supportedTriggers,
  triggerPickerDocsLink,
}) => {
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
    actionFactories?.some((f) => !f.isCompatibleLicence());

  const renderGetMoreActionsLink = () => (
    <EuiText size="s">
      <EuiLink
        href={GET_MORE_ACTIONS_LINK}
        target="_blank"
        external
        data-test-subj={'getMoreActionsLink'}
      >
        <FormattedMessage
          id="xpack.uiActionsEnhanced.drilldowns.components.FormDrilldownWizard.getMoreActionsLinkLabel"
          defaultMessage="Get more actions"
        />
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
        supportedTriggers={supportedTriggers}
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
