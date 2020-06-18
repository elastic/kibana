/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFieldText, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { txtDrilldownAction, txtNameOfDrilldown, txtUntitledDrilldown } from './i18n';
import { ActionFactory } from '../../../dynamic_actions';
import { ActionWizard } from '../../../components/action_wizard';

const noopFn = () => {};

export interface FormDrilldownWizardProps {
  name?: string;
  onNameChange?: (name: string) => void;

  currentActionFactory?: ActionFactory;
  onActionFactoryChange?: (actionFactory?: ActionFactory) => void;
  actionFactoryContext: object;

  actionConfig?: object;
  onActionConfigChange?: (config: object) => void;

  actionFactories?: ActionFactory[];
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

  const actionWizard = (
    <EuiFormRow
      label={actionFactories?.length > 1 ? txtDrilldownAction : undefined}
      fullWidth={true}
    >
      <ActionWizard
        actionFactories={actionFactories}
        currentActionFactory={currentActionFactory}
        config={actionConfig}
        onActionFactoryChange={(actionFactory) => onActionFactoryChange(actionFactory)}
        onConfigChange={(config) => onActionConfigChange(config)}
        context={actionFactoryContext}
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
