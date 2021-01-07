/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { of } from 'rxjs';
import { MountWithReduxProvider, mountWithRouter } from '../../../../../lib';
import { KibanaContextProvider } from '../../../../../../../../../src/plugins/kibana_react/public';
import { WaterfallChart } from './waterfall_chart';
import {
  renderLegendItem,
  renderSidebarItem,
} from '../../step_detail/waterfall/waterfall_chart_wrapper';
import { EuiThemeProvider } from '../../../../../../../observability/public';
import { WaterfallChartOuterContainer } from './styles';

describe('waterfall', () => {
  it('sets the correct height in case of full height', () => {
    const core = mockCore();

    const Component = () => {
      return (
        <WaterfallChart
          tickFormat={(d: number) => `${Number(d).toFixed(0)} ms`}
          domain={{
            max: 3371,
            min: 0,
          }}
          barStyleAccessor={(datum) => {
            return datum.datum.config.colour;
          }}
          renderSidebarItem={renderSidebarItem}
          renderLegendItem={renderLegendItem}
          fullHeight={true}
        />
      );
    };

    const component = mountWithRouter(
      <MountWithReduxProvider>
        <EuiThemeProvider darkMode={false}>
          <KibanaContextProvider services={{ ...core }}>
            <Component />
          </KibanaContextProvider>
        </EuiThemeProvider>
      </MountWithReduxProvider>
    );

    const chartWrapper = component.find(WaterfallChartOuterContainer);

    expect(chartWrapper.get(0).props.height).toBe('calc(100vh - 0px)');
  });
});

const mockCore: () => any = () => {
  return {
    application: {
      getUrlForApp: () => '/app/uptime',
      navigateToUrl: jest.fn(),
    },
    uiSettings: {
      get: (key: string) => 'MMM D, YYYY @ HH:mm:ss.SSS',
      get$: (key: string) => of('MMM D, YYYY @ HH:mm:ss.SSS'),
    },
  };
};
