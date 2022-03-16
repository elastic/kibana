/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiErrorBoundary } from '@elastic/eui';
import { mount } from 'enzyme';

import { UXAppRoot } from './ux_app';
import { RumHome } from '../components/app/rum_dashboard/rum_home';
import { coreMock } from '../../../../../src/core/public/mocks';
import { createObservabilityRuleTypeRegistryMock } from '../../../observability/public';
import { merge } from 'lodash';
import { UI_SETTINGS } from '../../../../../src/plugins/data/common';
import { embeddablePluginMock } from '../../../../../src/plugins/embeddable/public/mocks';

jest.mock('../services/rest/data_view', () => ({
  createStaticDataView: () => Promise.resolve(undefined),
}));

jest.mock('../components/app/rum_dashboard/rum_home', () => ({
  RumHome: () => <p>Home Mock</p>,
}));

const mockPlugin = {
  data: {
    query: {
      timefilter: { timefilter: { setTime: () => {}, getTime: () => ({}) } },
    },
  },
  observability: {
    isAlertingExperienceEnabled: () => false,
  },
};

const mockEmbeddable = embeddablePluginMock.createStartContract();

mockEmbeddable.getEmbeddableFactory = jest.fn().mockImplementation(() => ({
  create: () => ({
    reload: jest.fn(),
    setRenderTooltipContent: jest.fn(),
    setLayerList: jest.fn(),
  }),
}));

const mockCorePlugins = {
  embeddable: mockEmbeddable,
  inspector: {},
  maps: {},
  observability: {
    navigation: {
      registerSections: () => jest.fn(),
      PageTemplate: ({ children }: { children: React.ReactNode }) => (
        <div>hello worlds {children}</div>
      ),
    },
  },
  data: {
    query: {
      timefilter: {
        timefilter: {
          setTime: jest.fn(),
          getTime: jest.fn().mockReturnValue({}),
          getTimeDefaults: jest.fn().mockReturnValue({}),
          getRefreshIntervalDefaults: jest.fn().mockReturnValue({}),
          getRefreshInterval: jest.fn().mockReturnValue({}),
        },
      },
    },
  },
};
const coreStart = coreMock.createStart({ basePath: '/basepath' });

const mockCore = merge({}, coreStart, {
  application: {
    capabilities: {
      apm: {},
      ml: {},
    },
  },
  uiSettings: {
    get: (key: string) => {
      const uiSettings: Record<string, unknown> = {
        [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: [
          {
            from: 'now/d',
            to: 'now/d',
            display: 'Today',
          },
          {
            from: 'now/w',
            to: 'now/w',
            display: 'This week',
          },
        ],
        [UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS]: {
          from: 'now-15m',
          to: 'now',
        },
        [UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS]: {
          pause: false,
          value: 100000,
        },
      };
      return uiSettings[key];
    },
  },
});

export const mockApmPluginContextValue = {
  appMountParameters: coreMock.createAppMountParameters('/basepath'),
  core: mockCore,
  plugins: mockPlugin,
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  corePlugins: mockCorePlugins,
  deps: {},
};

describe('renderUxApp', () => {
  it('has an error boundary for the UXAppRoot', async () => {
    const wrapper = mount(
      <UXAppRoot {...(mockApmPluginContextValue as any)} />
    );

    wrapper
      .find(RumHome)
      .simulateError(new Error('Oh no, an unexpected error!'));

    expect(wrapper.find(RumHome)).toHaveLength(0);
    expect(wrapper.find(EuiErrorBoundary)).toHaveLength(1);
    expect(wrapper.find(EuiErrorBoundary).text()).toMatch(
      /Error: Oh no, an unexpected error!/
    );
  });
});
