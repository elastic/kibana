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
import {
  AdvancedUiActionsActionFactoryDefinition as ActionFactoryDefinition,
  AdvancedUiActionsActionFactory as ActionFactory,
  AdvancedUiActionsAnyActionFactory as AnyActionFactory,
} from '../../../../advanced_ui_actions/public';

type ActionBaseConfig = object;

export interface DrilldownWizardConfig<ActionConfig extends object = object> {
  name: string;
  actionFactory?: ActionFactory<ActionFactoryDefinition<ActionConfig, any, any>>;
  actionConfig?: ActionConfig;
}

export interface FlyoutDrilldownWizardProps<
  CurrentActionConfig extends ActionBaseConfig = ActionBaseConfig
> {
  drilldownActionFactories: AnyActionFactory[];

  onSubmit?: (drilldownWizardConfig: DrilldownWizardConfig) => void;
  onDelete?: () => void;
  onClose?: () => void;
  onBack?: () => void;

  mode?: 'create' | 'edit';
  initialDrilldownWizardConfig?: DrilldownWizardConfig<CurrentActionConfig>;

  showWelcomeMessage?: boolean;
  onWelcomeHideClick?: () => void;

  actionFactoryContext?: object;
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

  const isActionValid = (): boolean => {
    if (!wizardConfig.name) return false;
    if (!wizardConfig.actionFactory) return false;
    if (!wizardConfig.actionConfig) return false;

    return wizardConfig.actionFactory.isConfigValid(wizardConfig.actionConfig);
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
