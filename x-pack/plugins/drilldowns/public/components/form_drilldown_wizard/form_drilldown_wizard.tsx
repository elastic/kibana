/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import './form_drilldown_wizard.scss';
import { EuiForm, EuiFormRow, EuiFieldText, EuiSpacer } from '@elastic/eui';
import { DrilldownHelloBar } from '../drilldown_hello_bar';
import { txtNameOfDrilldown, txtUntitledDrilldown, txtDrilldownAction } from './i18n';
import {
  ActionWizard,
  ActionFactory,
  ActionFactoryBaseConfig,
} from '../../../../advanced_ui_actions/public';

// TODO: this should be actual input to the component and should not be using test data
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ACTION_FACTORIES } from '../../../../advanced_ui_actions/public/components/action_wizard/test_data';

const noop = () => {};

export interface FormDrilldownWizardProps {
  /**
   * Initial name - to be used during editing flow
   */
  initialName?: string;

  onNameChange?: (name: string) => void;

  /**
   * Initial action config - to be used during edit flow
   */
  initialActionConfig?: {
    actionFactory: ActionFactory | null;
    config: ActionFactoryBaseConfig | null;
  };

  /**
   * onActionConfigChange - Action's configuration changed
   * @param actionFactory - currently selected action factory. Null if non is selected
   * @param config - current corresponding config. Null if current config is invalid or incomplete
   */
  onActionConfigChange?: (
    actionFactory: ActionFactory | null,
    config: ActionFactoryBaseConfig | null
  ) => void;
}

export const FormDrilldownWizard: React.FC<FormDrilldownWizardProps> = ({
  initialName = '',
  initialActionConfig = { actionFactory: null, config: null },
  onNameChange = noop,
  onActionConfigChange = noop,
}) => {
  const [name, setName] = useState(initialName);
  const nameFragment = (
    <EuiFormRow label={txtNameOfDrilldown} className="drdFormDrilldownWizard__formRow">
      <EuiFieldText
        name="drilldown_name"
        placeholder={txtUntitledDrilldown}
        value={name}
        disabled={onNameChange === noop}
        onChange={event => {
          const newName = event.target.value;
          onNameChange(newName);
          setName(newName);
        }}
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
        actionFactories={ACTION_FACTORIES}
        initialActionConfig={initialActionConfig}
        onChange={(actionFactory, config) => {
          onActionConfigChange(actionFactory, config);
        }}
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
