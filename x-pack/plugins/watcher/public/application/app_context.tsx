/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { DocLinksStart } from '@kbn/core/public';
import { ACTION_TYPES } from '../../common/constants';
import { AppDeps } from './app';

interface ContextValue extends Omit<AppDeps, 'docLinks'> {
  links: ReturnType<typeof generateDocLinks>;
}

const AppContext = createContext<ContextValue>(null as any);

const generateDocLinks = ({ links }: DocLinksStart) => {
  const putWatchApiUrl = `${links.apis.putWatch}`;
  const executeWatchApiUrl = `${links.apis.executeWatchActionModes}`;
  const watcherGettingStartedUrl = `${links.watcher.ui}`;
  const watchActionsConfigurationMap = {
    [ACTION_TYPES.SLACK]: `${links.watcher.slackAction}`,
    [ACTION_TYPES.PAGERDUTY]: `${links.watcher.pagerDutyAction}`,
    [ACTION_TYPES.JIRA]: `${links.watcher.jiraAction}`,
  };

  return {
    putWatchApiUrl,
    executeWatchApiUrl,
    watcherGettingStartedUrl,
    watchActionsConfigurationMap,
  };
};

export const AppContextProvider = ({
  children,
  value,
}: {
  value: AppDeps;
  children: React.ReactNode;
}) => {
  const { docLinks, ...rest } = value;
  return (
    <AppContext.Provider
      value={Object.freeze({
        ...rest,
        links: generateDocLinks(docLinks),
      })}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('"useAppContext" can only be called inside of AppContext.Provider!');
  }
  return ctx;
};
