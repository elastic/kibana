/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import {
  ActionFactory,
  BaseActionConfig,
  BaseActionFactoryContext,
} from '../../../dynamic_actions';

export interface DrilldownWizardState<ActionConfig extends BaseActionConfig = BaseActionConfig> {
  name: string;
  actionFactory?: ActionFactory;
  actionConfig?: ActionConfig;
  selectedTriggers?: string[];
}

export function useDrilldownWizard(
  actionFactoryContext: BaseActionFactoryContext,
  initialDrilldownWizardConfig?: DrilldownWizardState
): [
  DrilldownWizardState,
  {
    setName: (name: string) => void;
    setActionConfig: (actionConfig: BaseActionConfig) => void;
    setActionFactory: (actionFactory?: ActionFactory) => void;
    setSelectedTriggers: (triggers?: string[]) => void;
  }
] {
  const [wizardConfig, setWizardConfig] = useState<DrilldownWizardState>(
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
      setSelectedTriggers: (selectedTriggers: string[] = []) => {
        setWizardConfig({
          ...wizardConfig,
          selectedTriggers,
        });
      },
    },
  ];
}
