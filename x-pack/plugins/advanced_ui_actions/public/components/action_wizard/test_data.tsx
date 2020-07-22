/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFieldText, EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
import { ActionFactory, ActionBaseConfig, ActionWizard } from './action_wizard';

export const dashboards = [
  { id: 'dashboard1', title: 'Dashboard 1' },
  { id: 'dashboard2', title: 'Dashboard 2' },
];

export const dashboardDrilldownActionFactory: ActionFactory<{
  dashboardId?: string;
  useCurrentDashboardFilters: boolean;
  useCurrentDashboardDataRange: boolean;
}> = {
  type: 'Dashboard',
  displayName: 'Go to Dashboard',
  iconType: 'dashboardApp',
  createConfig: () => {
    return {
      dashboardId: undefined,
      useCurrentDashboardDataRange: true,
      useCurrentDashboardFilters: true,
    };
  },
  isValid: (config) => {
    if (!config.dashboardId) return false;
    return true;
  },
  wizard: (props) => {
    const config = props.config ?? {
      dashboardId: undefined,
      useCurrentDashboardDataRange: true,
      useCurrentDashboardFilters: true,
    };
    return (
      <>
        <EuiFormRow label="Choose destination dashboard:">
          <EuiSelect
            name="selectDashboard"
            hasNoInitialSelection={true}
            options={dashboards.map(({ id, title }) => ({ value: id, text: title }))}
            value={config.dashboardId}
            onChange={(e) => {
              props.onConfig({ ...config, dashboardId: e.target.value });
            }}
          />
        </EuiFormRow>
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="useCurrentFilters"
            label="Use current dashboard's filters"
            checked={config.useCurrentDashboardFilters}
            onChange={() =>
              props.onConfig({
                ...config,
                useCurrentDashboardFilters: !config.useCurrentDashboardFilters,
              })
            }
          />
        </EuiFormRow>
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="useCurrentDateRange"
            label="Use current dashboard's date range"
            checked={config.useCurrentDashboardDataRange}
            onChange={() =>
              props.onConfig({
                ...config,
                useCurrentDashboardDataRange: !config.useCurrentDashboardDataRange,
              })
            }
          />
        </EuiFormRow>
      </>
    );
  },
};

export const urlDrilldownActionFactory: ActionFactory<{ url: string; openInNewTab: boolean }> = {
  type: 'Url',
  displayName: 'Go to URL',
  iconType: 'link',
  createConfig: () => {
    return {
      url: '',
      openInNewTab: false,
    };
  },
  isValid: (config) => {
    if (!config.url) return false;
    return true;
  },
  wizard: (props) => {
    const config = props.config ?? {
      url: '',
      openInNewTab: false,
    };
    return (
      <>
        <EuiFormRow label="Enter target URL">
          <EuiFieldText
            placeholder="Enter URL"
            name="url"
            value={config.url}
            onChange={(event) => props.onConfig({ ...config, url: event.target.value })}
          />
        </EuiFormRow>
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="openInNewTab"
            label="Open in new tab?"
            checked={config.openInNewTab}
            onChange={() => props.onConfig({ ...config, openInNewTab: !config.openInNewTab })}
          />
        </EuiFormRow>
      </>
    );
  },
};

export function Demo({ actionFactories }: { actionFactories: Array<ActionFactory<any>> }) {
  const [state, setState] = useState<{
    currentActionFactory?: ActionFactory;
    config?: ActionBaseConfig;
  }>({});

  function changeActionFactory(newActionFactory: ActionFactory | null) {
    if (!newActionFactory) {
      // removing action factory
      return setState({});
    }

    setState({
      currentActionFactory: newActionFactory,
      config: newActionFactory.createConfig(),
    });
  }

  return (
    <>
      <ActionWizard
        actionFactories={actionFactories}
        config={state.config}
        onConfigChange={(newConfig) => {
          setState({
            ...state,
            config: newConfig,
          });
        }}
        onActionFactoryChange={(newActionFactory) => {
          changeActionFactory(newActionFactory);
        }}
        currentActionFactory={state.currentActionFactory}
      />
      <div style={{ marginTop: '44px' }} />
      <hr />
      <div>Action Factory Type: {state.currentActionFactory?.type}</div>
      <div>Action Factory Config: {JSON.stringify(state.config)}</div>
      <div>
        Is config valid:{' '}
        {JSON.stringify(state.currentActionFactory?.isValid(state.config!) ?? false)}
      </div>
    </>
  );
}
