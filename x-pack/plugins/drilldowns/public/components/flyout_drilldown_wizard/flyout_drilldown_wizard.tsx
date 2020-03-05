/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { FormDrilldownWizard } from '../form_drilldown_wizard';
import { FlyoutFrame } from '../flyout_frame';
import {
  txtCreateDrilldownButtonLabel,
  txtCreateDrilldownTitle,
  txtDeleteDrilldownButtonLabel,
  txtEditDrilldownButtonLabel,
  txtEditDrilldownTitle,
} from './i18n';
import { ActionBaseConfig, ActionFactory } from '../../../../advanced_ui_actions/public';
import {
  dashboardDrilldownActionFactory,
  urlDrilldownActionFactory,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../advanced_ui_actions/public/components/action_wizard/test_data';

export interface DrilldownWizardConfig<ActionConfig extends ActionBaseConfig = ActionBaseConfig> {
  name: string;
  actionFactory?: ActionFactory<ActionConfig>;
  actionConfig?: ActionConfig;
}

export interface FlyoutDrilldownWizardProps<
  CurrentActionConfig extends ActionBaseConfig = ActionBaseConfig
> {
  onSubmit?: (drilldownWizardConfig: DrilldownWizardConfig) => void;
  onDelete?: () => void;
  onClose?: () => void;
  onBack?: () => void;

  mode?: 'create' | 'edit';
  initialDrilldownWizardConfig?: DrilldownWizardConfig<CurrentActionConfig>;
}

export function FlyoutDrilldownWizard<
  CurrentActionConfig extends ActionBaseConfig = ActionBaseConfig
>({
  onClose,
  onBack,
  onSubmit = () => {},
  initialDrilldownWizardConfig,
  mode = 'create',
  onDelete = () => {},
}: FlyoutDrilldownWizardProps<CurrentActionConfig>) {
  const [wizardConfig, setWizardConfig] = useState<DrilldownWizardConfig>(
    () =>
      initialDrilldownWizardConfig ?? {
        name: '',
      }
  );

  const isActionValid = (): boolean => {
    if (!wizardConfig.actionFactory) return false;
    if (!wizardConfig.actionConfig) return false;

    return wizardConfig.actionFactory.isValid(wizardConfig.name, wizardConfig.actionConfig);
  };

  const footer = (
    <EuiButton
      onClick={() => {
        if (isActionValid()) {
          onSubmit(wizardConfig);
        }
      }}
      fill
      isDisabled={!isActionValid()}
    >
      {mode === 'edit' ? txtEditDrilldownButtonLabel : txtCreateDrilldownButtonLabel}
    </EuiButton>
  );

  return (
    <FlyoutFrame
      title={mode === 'edit' ? txtEditDrilldownTitle : txtCreateDrilldownTitle}
      footer={footer}
      onClose={onClose}
      onBack={onBack}
    >
      <FormDrilldownWizard
        name={wizardConfig.name}
        onNameChange={newName => {
          setWizardConfig({
            ...wizardConfig,
            name: newName,
          });
        }}
        actionConfig={wizardConfig.actionConfig}
        onActionConfigChange={newActionConfig => {
          setWizardConfig({
            ...wizardConfig,
            actionConfig: newActionConfig,
          });
        }}
        currentActionFactory={wizardConfig.actionFactory}
        onActionFactoryChange={actionFactory => {
          if (!actionFactory) {
            setWizardConfig({
              ...wizardConfig,
              actionFactory: undefined,
              actionConfig: undefined,
            });
          } else {
            setWizardConfig({
              ...wizardConfig,
              actionFactory,
              actionConfig: actionFactory.createConfig(),
            });
          }
        }}
        actionFactories={[dashboardDrilldownActionFactory, urlDrilldownActionFactory]}
      />
      {mode === 'edit' && (
        <>
          <EuiSpacer size={'xl'} />
          <EuiButton onClick={onDelete} color={'danger'}>
            {txtDeleteDrilldownButtonLabel}
          </EuiButton>
        </>
      )}
    </FlyoutFrame>
  );
}
