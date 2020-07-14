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
import { ActionFactory } from '../../../dynamic_actions';

export interface DrilldownWizardConfig<ActionConfig extends object = object> {
  name: string;
  actionFactory?: ActionFactory;
  actionConfig?: ActionConfig;
}

export interface FlyoutDrilldownWizardProps<CurrentActionConfig extends object = object> {
  drilldownActionFactories: ActionFactory[];

  onSubmit?: (drilldownWizardConfig: Required<DrilldownWizardConfig>) => void;
  onDelete?: () => void;
  onClose?: () => void;
  onBack?: () => void;

  mode?: 'create' | 'edit';
  initialDrilldownWizardConfig?: DrilldownWizardConfig<CurrentActionConfig>;

  showWelcomeMessage?: boolean;
  onWelcomeHideClick?: () => void;

  actionFactoryContext?: object;

  docsLink?: string;
}

function useWizardConfigState(
  initialDrilldownWizardConfig?: DrilldownWizardConfig
): [
  DrilldownWizardConfig,
  {
    setName: (name: string) => void;
    setActionConfig: (actionConfig: object) => void;
    setActionFactory: (actionFactory?: ActionFactory) => void;
  }
] {
  const [wizardConfig, setWizardConfig] = useState<DrilldownWizardConfig>(
    () =>
      initialDrilldownWizardConfig ?? {
        name: '',
      }
  );
  const [actionConfigCache, setActionConfigCache] = useState<Record<string, object>>(
    initialDrilldownWizardConfig?.actionFactory
      ? {
          [initialDrilldownWizardConfig.actionFactory
            .id]: initialDrilldownWizardConfig.actionConfig!,
        }
      : {}
  );

  return [
    wizardConfig,
    {
      setName: (name: string) => {
        setWizardConfig({
          ...wizardConfig,
          name,
        });
      },
      setActionConfig: (actionConfig: object) => {
        setWizardConfig({
          ...wizardConfig,
          actionConfig,
        });
      },
      setActionFactory: (actionFactory?: ActionFactory) => {
        if (actionFactory) {
          setWizardConfig({
            ...wizardConfig,
            actionFactory,
            actionConfig: actionConfigCache[actionFactory.id] ?? actionFactory.createConfig(),
          });
        } else {
          if (wizardConfig.actionFactory?.id) {
            setActionConfigCache({
              ...actionConfigCache,
              [wizardConfig.actionFactory.id]: wizardConfig.actionConfig!,
            });
          }

          setWizardConfig({
            ...wizardConfig,
            actionFactory: undefined,
            actionConfig: undefined,
          });
        }
      },
    },
  ];
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
  docsLink,
}: FlyoutDrilldownWizardProps<CurrentActionConfig>) {
  const [wizardConfig, { setActionFactory, setActionConfig, setName }] = useWizardConfigState(
    initialDrilldownWizardConfig
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
      data-test-subj={'drilldownWizardSubmit'}
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
      banner={
        showWelcomeMessage && (
          <DrilldownHelloBar docsLink={docsLink} onHideClick={onWelcomeHideClick} />
        )
      }
    >
      <FormDrilldownWizard
        name={wizardConfig.name}
        onNameChange={setName}
        actionConfig={wizardConfig.actionConfig}
        onActionConfigChange={setActionConfig}
        currentActionFactory={wizardConfig.actionFactory}
        onActionFactoryChange={setActionFactory}
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
