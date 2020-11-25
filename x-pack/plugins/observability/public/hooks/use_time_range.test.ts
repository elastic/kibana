/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useTimeRange } from './use_time_range';
import * as pluginContext from './use_plugin_context';
import { AppMountParameters, CoreStart } from 'kibana/public';
import { ObservabilityPluginSetupDeps } from '../plugin';
import * as kibanaUISettings from './use_kibana_ui_settings';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/observability/overview/',
    search: '',
  }),
}));

describe('useTimeRange', () => {
  beforeAll(() => {
    jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
      core: {} as CoreStart,
      appMountParameters: {} as AppMountParameters,
      plugins: ({
        data: {
          query: {
            timefilter: {
              timefilter: {
                getTime: jest.fn().mockImplementation(() => ({
                  from: '2020-10-08T06:00:00.000Z',
                  to: '2020-10-08T07:00:00.000Z',
                })),
              },
            },
          },
        },
      } as unknown) as ObservabilityPluginSetupDeps,
    }));
    jest.spyOn(kibanaUISettings, 'useKibanaUISettings').mockImplementation(() => ({
      from: '2020-10-08T05:00:00.000Z',
      to: '2020-10-08T06:00:00.000Z',
    }));
  });

  describe('when range from and to are not provided', () => {
    describe('when data plugin has time set', () => {
      it('returns ranges and absolute times from data plugin', () => {
        const relativeStart = '2020-10-08T06:00:00.000Z';
        const relativeEnd = '2020-10-08T07:00:00.000Z';
        const timeRange = useTimeRange();
        expect(timeRange).toEqual({
          relativeStart,
          relativeEnd,
          absoluteStart: new Date(relativeStart).valueOf(),
          absoluteEnd: new Date(relativeEnd).valueOf(),
        });
      });
    });
    describe("when data plugin doesn't have time set", () => {
      beforeAll(() => {
        jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
          core: {} as CoreStart,
          appMountParameters: {} as AppMountParameters,
          plugins: ({
            data: {
              query: {
                timefilter: {
                  timefilter: {
                    getTime: jest.fn().mockImplementation(() => ({
                      from: undefined,
                      to: undefined,
                    })),
                  },
                },
              },
            },
          } as unknown) as ObservabilityPluginSetupDeps,
        }));
      });
      it('returns ranges and absolute times from kibana default settings', () => {
        const relativeStart = '2020-10-08T05:00:00.000Z';
        const relativeEnd = '2020-10-08T06:00:00.000Z';
        const timeRange = useTimeRange();
        expect(timeRange).toEqual({
          relativeStart,
          relativeEnd,
          absoluteStart: new Date(relativeStart).valueOf(),
          absoluteEnd: new Date(relativeEnd).valueOf(),
        });
      });
    });
  });
});
