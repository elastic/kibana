/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
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
  ActionFactory,
  BaseActionConfig,
  BaseActionFactoryContext,
} from '../../../dynamic_actions';
import { Trigger, TriggerId } from '../../../../../../../src/plugins/ui_actions/public';
import { ActionFactoryPlaceContext } from '../types';

export interface DrilldownWizardConfig<ActionConfig extends BaseActionConfig = BaseActionConfig> {
  name: string;
  actionFactory?: ActionFactory;
  actionConfig?: ActionConfig;
  selectedTriggers?: TriggerId[];
}

export interface FlyoutDrilldownWizardProps<
  CurrentActionConfig extends BaseActionConfig = BaseActionConfig,
  ActionFactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
> {
  drilldownActionFactories: ActionFactory[];

  onSubmit?: (drilldownWizardConfig: Required<DrilldownWizardConfig>) => void;
  onDelete?: () => void;
  onClose?: () => void;
  onBack?: () => void;

  mode?: 'create' | 'edit';
  initialDrilldownWizardConfig?: DrilldownWizardConfig<CurrentActionConfig>;

  showWelcomeMessage?: boolean;
  onWelcomeHideClick?: () => void;

  actionFactoryPlaceContext?: ActionFactoryPlaceContext<ActionFactoryContext>;

  /**
   * General overview of drilldowns
   */
  docsLink?: string;

  /**
   * Link that explains different triggers
   */
  triggerPickerDocsLink?: string;

  getTrigger: (triggerId: TriggerId) => Trigger;

  /**
   * List of possible triggers in current context
   */
  supportedTriggers: TriggerId[];
}

function useWizardConfigState(
  actionFactoryContext: BaseActionFactoryContext,
  initialDrilldownWizardConfig?: DrilldownWizardConfig
): [
  DrilldownWizardConfig,
  {
    setName: (name: string) => void;
    setActionConfig: (actionConfig: BaseActionConfig) => void;
    setActionFactory: (actionFactory?: ActionFactory) => void;
    setSelectedTriggers: (triggers?: TriggerId[]) => void;
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
      setActionConfig: (actionConfig: BaseActionConfig) => {
        setWizardConfig({
          ...wizardConfig,
          actionConfig,
        });
      },
      setActionFactory: (actionFactory?: ActionFactory) => {
        if (actionFactory) {
          const actionConfig = (actionConfigCache[actionFactory.id] ??
            actionFactory.createConfig(actionFactoryContext)) as BaseActionConfig;
          setWizardConfig({
            ...wizardConfig,
            actionFactory,
            actionConfig,
            selectedTriggers: [],
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
      setSelectedTriggers: (selectedTriggers: TriggerId[] = []) => {
        setWizardConfig({
          ...wizardConfig,
          selectedTriggers,
        });
      },
    },
  ];
}

export function FlyoutDrilldownWizard<
  CurrentActionConfig extends BaseActionConfig = BaseActionConfig
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
  actionFactoryPlaceContext,
  docsLink,
  triggerPickerDocsLink,
  getTrigger,
  supportedTriggers,
}: FlyoutDrilldownWizardProps<CurrentActionConfig>) {
  const [
    wizardConfig,
    { setActionFactory, setActionConfig, setName, setSelectedTriggers },
  ] = useWizardConfigState(
    { ...actionFactoryPlaceContext, triggers: supportedTriggers },
    initialDrilldownWizardConfig
  );

  const actionFactoryContext: BaseActionFactoryContext = useMemo(
    () => ({
      ...actionFactoryPlaceContext,
      triggers: wizardConfig.selectedTriggers ?? [],
    }),
    [actionFactoryPlaceContext, wizardConfig.selectedTriggers]
  );

  const isActionValid = (
    config: DrilldownWizardConfig
  ): config is Required<DrilldownWizardConfig> => {
    if (!wizardConfig.name) return false;
    if (!wizardConfig.actionFactory) return false;
    if (!wizardConfig.actionConfig) return false;
    if (!wizardConfig.selectedTriggers || wizardConfig.selectedTriggers.length === 0) return false;

    return wizardConfig.actionFactory.isConfigValid(
      wizardConfig.actionConfig,
      actionFactoryContext
    );
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
        actionFactoryContext={actionFactoryContext}
        onSelectedTriggersChange={setSelectedTriggers}
        triggers={supportedTriggers}
        getTriggerInfo={getTrigger}
        triggerPickerDocsLink={triggerPickerDocsLink}
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
