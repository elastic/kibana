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
import { DrilldownHelloBar } from '../drilldown_hello_bar';
import { AdvancedUiActionsActionFactory as ActionFactory } from '../../../../advanced_ui_actions/public';

export interface DrilldownWizardConfig<ActionConfig extends object = object> {
  name: string;
  actionFactory?: ActionFactory;
  actionConfig?: ActionConfig;
}

export interface FlyoutDrilldownWizardProps<CurrentActionConfig extends object = object> {
  drilldownActionFactories: Array<ActionFactory<any>>;

  onSubmit?: (drilldownWizardConfig: Required<DrilldownWizardConfig>) => void;
  onDelete?: () => void;
  onClose?: () => void;
  onBack?: () => void;

  mode?: 'create' | 'edit';
  initialDrilldownWizardConfig?: DrilldownWizardConfig<CurrentActionConfig>;

  showWelcomeMessage?: boolean;
  onWelcomeHideClick?: () => void;

  actionFactoryContext?: object;
}

export function FlyoutDrilldownWizard<CurrentActionConfig extends object = object>({
  onClose,
  onBack,
  onSubmit = () => {},
  initialDrilldownWizardConfig,
  mode = 'create',
  onDelete = () => {},
  showWelcomeMessage = true,
  onWelcomeHideClick,
  drilldownActionFactories,
  actionFactoryContext,
}: FlyoutDrilldownWizardProps<CurrentActionConfig>) {
  const [wizardConfig, setWizardConfig] = useState<DrilldownWizardConfig>(
    () =>
      initialDrilldownWizardConfig ?? {
        name: '',
      }
  );

  const isActionValid = (
    config: DrilldownWizardConfig
  ): config is Required<DrilldownWizardConfig> => {
    if (!wizardConfig.name) return false;
    if (!wizardConfig.actionFactory) return false;
    if (!wizardConfig.actionConfig) return false;

    return wizardConfig.actionFactory.isConfigValid(wizardConfig.actionConfig);
  };

  const footer = (
    <EuiButton
      onClick={() => {
        if (isActionValid(wizardConfig)) {
          onSubmit(wizardConfig);
        }
      }}
      fill
      isDisabled={!isActionValid(wizardConfig)}
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
      banner={showWelcomeMessage && <DrilldownHelloBar onHideClick={onWelcomeHideClick} />}
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
        actionFactories={drilldownActionFactories}
        actionFactoryContext={actionFactoryContext!}
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
