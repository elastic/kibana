/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import type {
  PublicDrilldownManagerProps,
  DrilldownManagerDependencies,
  DrilldownManagerContextValue as Value,
} from './types';
import { useWelcomeMessage } from '../../hooks/use_welcome_message';
import { BaseActionConfig } from '../../../dynamic_actions';

const context = React.createContext<Value | null>(null);

export const useDrilldownManager = () => React.useContext(context)!;

export interface DrilldownManagerProviderProps
  extends PublicDrilldownManagerProps,
    DrilldownManagerDependencies {}

interface ActionFactoryCacheItem {
  config: BaseActionConfig;
}

export const DrilldownManagerProvider: React.FC<DrilldownManagerProviderProps> = ({
  children,
  ...rest
}) => {
  const [drilldownName, setDrilldownName] = React.useState<string>('');
  const [actionFactory, setActionFactory] = React.useState<Value['actionFactory']>(undefined);
  const [actionConfig, setActionConfig] = React.useState<Value['actionConfig']>(undefined);
  const [actionFactoryCache, setActionFactoryCache] = React.useState<
    Record<string, ActionFactoryCacheItem>
  >(
    actionFactory && actionConfig
      ? {
          [actionFactory.id]: {
            config: actionConfig,
          },
        }
      : {}
  );
  const [selectedTriggers, setSelectedTriggers] = React.useState<Value['selectedTriggers']>(
    undefined
  );
  const [showWelcomeMessage, hideWelcomeMessage] = useWelcomeMessage(rest.storage);

  const setActionFactoryPublic = React.useCallback(
    (newActionFactory: Value['actionFactory']) => {
      if (actionFactory?.id && !!actionConfig) {
        setActionFactoryCache({
          ...actionFactoryCache,
          [actionFactory.id]: {
            config: actionConfig,
          },
        });
      }

      setSelectedTriggers(undefined);

      if (!newActionFactory) {
        setActionFactory(undefined);
        setActionConfig(undefined);
        return;
      }

      setActionFactory(newActionFactory);

      const newActionConfig = (!!actionFactoryCache[newActionFactory.id]
        ? actionFactoryCache[newActionFactory.id].config
        : newActionFactory.createConfig({
            ...rest.placeContext,
            triggers: rest.triggers,
          })) as BaseActionConfig;
      setActionConfig(newActionConfig);
    },
    [actionFactoryCache, actionFactory, actionConfig, rest.placeContext, rest.triggers]
  );

  const contextValue: Value = {
    ...rest,
    currentTab: rest.tab === 'create' ? 'create' : 'list',
    showWelcomeMessage,
    hideWelcomeMessage,
    drilldownName,
    setDrilldownName,
    actionFactory,
    setActionFactory: setActionFactoryPublic,
    actionConfig,
    setActionConfig,
    selectedTriggers,
    setSelectedTriggers,
  };

  return <context.Provider value={contextValue}>{children}</context.Provider>;
};
