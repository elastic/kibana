/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { shallow } from 'enzyme';
import * as PluginContext from '../../hooks/use_plugin_context';
import { PluginContextValue } from '../../context/plugin_context';
import { OverviewPage } from '.';
import { OverviewPage as OldOverviewPage } from './old_overview_page';
import { OverviewPage as NewOverviewPage } from './overview_page';

describe('Overview page', () => {
  it('should render the old overview page when feature flag is disabled and queryParams are empty', () => {
    const pluginContext = {
      config: {
        unsafe: {
          overviewNext: { enabled: false },
        },
      },
    };

    jest
      .spyOn(PluginContext, 'usePluginContext')
      .mockReturnValue(pluginContext as PluginContextValue);

    const component = shallow(<OverviewPage routeParams={{ query: {} }} />);
    expect(component.find(OldOverviewPage)).toHaveLength(1);
    expect(component.find(NewOverviewPage)).toHaveLength(0);
  });

  it('should render the new overview page when feature flag is enabled and queryParams are empty', () => {
    const pluginContext = {
      config: {
        unsafe: {
          overviewNext: { enabled: true },
        },
      },
    };

    jest
      .spyOn(PluginContext, 'usePluginContext')
      .mockReturnValue(pluginContext as PluginContextValue);

    const component = shallow(<OverviewPage routeParams={{ query: {} }} />);
    expect(component.find(OldOverviewPage)).toHaveLength(0);
    expect(component.find(NewOverviewPage)).toHaveLength(1);
  });

  it('should render the new overview page when feature flag is enabled and alpha param is in the url', () => {
    const pluginContext = {
      config: {
        unsafe: {
          overviewNext: { enabled: true },
        },
      },
    };

    jest
      .spyOn(PluginContext, 'usePluginContext')
      .mockReturnValue(pluginContext as PluginContextValue);

    const component = shallow(<OverviewPage routeParams={{ query: { alpha: true } }} />);
    expect(component.find(OldOverviewPage)).toHaveLength(0);
    expect(component.find(NewOverviewPage)).toHaveLength(1);
  });

  it('should render the new overview page when feature flag is disabled and alpha param is in the url', () => {
    const pluginContext = {
      config: {
        unsafe: {
          overviewNext: { enabled: false },
        },
      },
    };

    jest
      .spyOn(PluginContext, 'usePluginContext')
      .mockReturnValue(pluginContext as PluginContextValue);

    const component = shallow(<OverviewPage routeParams={{ query: { alpha: true } }} />);
    expect(component.find(OldOverviewPage)).toHaveLength(0);
    expect(component.find(NewOverviewPage)).toHaveLength(1);
  });
});
