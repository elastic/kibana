/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFieldText, EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
import { reactToUiComponent } from '../../../../../../src/plugins/kibana_react/public';
import { ActionWizard } from './action_wizard';
import { ActionFactoryDefinition, ActionFactory } from '../../dynamic_actions';
import { CollectConfigProps } from '../../../../../../src/plugins/kibana_utils/public';
import { licenseMock } from '../../../../licensing/common/licensing.mock';

type ActionBaseConfig = object;

export const dashboards = [
  { id: 'dashboard1', title: 'Dashboard 1' },
  { id: 'dashboard2', title: 'Dashboard 2' },
];

interface DashboardDrilldownConfig {
  dashboardId?: string;
  useCurrentFilters: boolean;
  useCurrentDateRange: boolean;
}

function DashboardDrilldownCollectConfig(props: CollectConfigProps<DashboardDrilldownConfig>) {
  const config = props.config ?? {
    dashboardId: undefined,
    useCurrentFilters: true,
    useCurrentDateRange: true,
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
          checked={config.useCurrentFilters}
          onChange={() =>
            props.onConfig({
              ...config,
              useCurrentFilters: !config.useCurrentFilters,
            })
          }
        />
      </EuiFormRow>
      <EuiFormRow hasChildLabel={false}>
        <EuiSwitch
          name="useCurrentDateRange"
          label="Use current dashboard's date range"
          checked={config.useCurrentDateRange}
          onChange={() =>
            props.onConfig({
              ...config,
              useCurrentDateRange: !config.useCurrentDateRange,
            })
          }
        />
      </EuiFormRow>
    </>
  );
}

export const dashboardDrilldownActionFactory: ActionFactoryDefinition<
  DashboardDrilldownConfig,
  any,
  any
> = {
  id: 'Dashboard',
  getDisplayName: () => 'Go to Dashboard',
  getIconType: () => 'dashboardApp',
  createConfig: () => {
    return {
      dashboardId: undefined,
      useCurrentFilters: true,
      useCurrentDateRange: true,
    };
  },
  isConfigValid: (config: DashboardDrilldownConfig): config is DashboardDrilldownConfig => {
    if (!config.dashboardId) return false;
    return true;
  },
  CollectConfig: reactToUiComponent(DashboardDrilldownCollectConfig),

  isCompatible(context?: object): Promise<boolean> {
    return Promise.resolve(true);
  },
  order: 0,
  create: () => ({
    id: 'test',
    execute: async () => alert('Navigate to dashboard!'),
    enhancements: {},
  }),
};

export const dashboardFactory = new ActionFactory(dashboardDrilldownActionFactory, () =>
  licenseMock.createLicense()
);

interface UrlDrilldownConfig {
  url: string;
  openInNewTab: boolean;
}
function UrlDrilldownCollectConfig(props: CollectConfigProps<UrlDrilldownConfig>) {
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
}
export const urlDrilldownActionFactory: ActionFactoryDefinition<UrlDrilldownConfig> = {
  id: 'Url',
  getDisplayName: () => 'Go to URL',
  getIconType: () => 'link',
  createConfig: () => {
    return {
      url: '',
      openInNewTab: false,
    };
  },
  isConfigValid: (config: UrlDrilldownConfig): config is UrlDrilldownConfig => {
    if (!config.url) return false;
    return true;
  },
  CollectConfig: reactToUiComponent(UrlDrilldownCollectConfig),

  order: 10,
  isCompatible(context?: object): Promise<boolean> {
    return Promise.resolve(true);
  },
  create: () => null as any,
};

export const urlFactory = new ActionFactory(urlDrilldownActionFactory, () =>
  licenseMock.createLicense()
);

export function Demo({ actionFactories }: { actionFactories: Array<ActionFactory<any>> }) {
  const [state, setState] = useState<{
    currentActionFactory?: ActionFactory;
    config?: ActionBaseConfig;
  }>({});

  function changeActionFactory(newActionFactory?: ActionFactory) {
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
        context={{}}
      />
      <div style={{ marginTop: '44px' }} />
      <hr />
      <div>Action Factory Id: {state.currentActionFactory?.id}</div>
      <div>Action Factory Config: {JSON.stringify(state.config)}</div>
      <div>
        Is config valid:{' '}
        {JSON.stringify(state.currentActionFactory?.isConfigValid(state.config!) ?? false)}
      </div>
    </>
  );
}
