/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import './index.scss';
import { EuiForm, EuiFormRow, EuiFieldText, EuiSpacer } from '@elastic/eui';
import { DrilldownHelloBar } from '../drilldown_hello_bar';
import { txtNameOfDrilldown, txtUntitledDrilldown, txtDrilldownAction } from './i18n';
import {
  ActionWizard,
  ActionFactory,
  ActionFactoryBaseConfig,
} from '../../../../../../src/plugins/ui_actions/public';

// TODO: this should be actual input to the component and should not be using test data
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ACTION_FACTORIES } from '../../../../../../src/plugins/ui_actions/public/components/action_wizard/test_data';

const noop = () => {};

export interface FormCreateDrilldownProps {
  name?: string;
  onNameChange?: (name: string) => void;
  onActionChange?: (
    actionFactory: ActionFactory<ActionFactoryBaseConfig, unknown> | null,
    config: ActionFactoryBaseConfig | null
  ) => void;
}

export const FormCreateDrilldown: React.FC<FormCreateDrilldownProps> = ({
  name = '',
  onNameChange = noop,
  onActionChange = noop,
}) => {
  const nameFragment = (
    <EuiFormRow label={txtNameOfDrilldown} className={'drilldowns__formCreateDrillDownEuiFormRow'}>
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
      className={'drilldowns__formCreateDrillDownEuiFormRow'}
    >
      <ActionWizard
        actionFactories={ACTION_FACTORIES}
        onChange={(actionFactory, config) => {
          onActionChange(actionFactory, config);
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
