/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import './form_drilldown_wizard.scss';
import { EuiFieldText, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { DrilldownHelloBar } from '../drilldown_hello_bar';
import { txtDrilldownAction, txtNameOfDrilldown, txtUntitledDrilldown } from './i18n';
import {
  ActionFactory,
  ActionBaseConfig,
  ActionWizard,
} from '../../../../advanced_ui_actions/public';
// TODO: this should be actual input to the component and should not be using test data
// eslint-disable-next-line @kbn/eslint/no-restricted-paths

const noop = () => {};

export interface FormDrilldownWizardProps {
  name?: string;
  onNameChange?: (name: string) => void;

  currentActionFactory?: ActionFactory;
  onActionFactoryChange?: (actionFactory: ActionFactory | null) => void;

  actionConfig?: ActionBaseConfig;
  onActionConfigChange?: (config: ActionBaseConfig) => void;

  actionFactories?: Array<ActionFactory<any>>;
}

export const FormDrilldownWizard: React.FC<FormDrilldownWizardProps> = ({
  name = '',
  actionConfig,
  currentActionFactory,
  onNameChange = noop,
  onActionConfigChange = noop,
  onActionFactoryChange = noop,
  actionFactories = [],
}) => {
  const nameFragment = (
    <EuiFormRow label={txtNameOfDrilldown} className="drdFormDrilldownWizard__formRow">
      <EuiFieldText
        name="drilldown_name"
        placeholder={txtUntitledDrilldown}
        value={name}
        disabled={onNameChange === noop}
        onChange={event => onNameChange(event.target.value)}
        data-test-subj="dynamicActionNameInput"
      />
    </EuiFormRow>
  );

  const actionWizard = (
    <EuiFormRow
      label={txtDrilldownAction}
      fullWidth={true}
      className="drdFormDrilldownWizard__formRow"
    >
      <ActionWizard
        actionFactories={actionFactories}
        currentActionFactory={currentActionFactory}
        config={actionConfig}
        onActionFactoryChange={actionFactory => onActionFactoryChange(actionFactory)}
        onConfigChange={config => onActionConfigChange(config)}
      />
    </EuiFormRow>
  );

  return (
    <>
      <DrilldownHelloBar />
      <EuiSpacer size={'l'} />
      <EuiForm>
        {nameFragment}
        <EuiSpacer size={'xl'} />
        {actionWizard}
      </EuiForm>
    </>
  );
};
