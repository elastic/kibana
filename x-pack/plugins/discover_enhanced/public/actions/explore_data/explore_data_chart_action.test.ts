/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExploreDataChartAction } from './explore_data_chart_action';
import { Params, PluginDeps } from './abstract_explore_data_action';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { UrlGeneratorContract } from '../../../../../../src/plugins/share/public';
import { ExploreDataChartActionContext } from './explore_data_chart_action';
import { i18n } from '@kbn/i18n';
import {
  VisualizeEmbeddableContract,
  VISUALIZE_EMBEDDABLE_TYPE,
} from '../../../../../../src/plugins/visualizations/public';
import { ViewMode } from '../../../../../../src/plugins/embeddable/public';
import { Filter, RangeFilter } from '../../../../../../src/plugins/data/public';

const i18nTranslateSpy = (i18n.translate as unknown) as jest.SpyInstance;

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: jest.fn((key, options) => options.defaultMessage),
  },
}));

afterEach(() => {
  i18nTranslateSpy.mockClear();
});

const setup = (
  {
    useRangeEvent = false,
    timeFieldName,
    filters = [],
    dashboardOnlyMode = false,
  }: {
    useRangeEvent?: boolean;
    filters?: Filter[];
    timeFieldName?: string;
    dashboardOnlyMode?: boolean;
  } = { filters: [] }
) => {
  type UrlGenerator = UrlGeneratorContract<'DISCOVER_APP_URL_GENERATOR'>;

  const core = coreMock.createStart();

  const urlGenerator: UrlGenerator = ({
    createUrl: jest.fn(() => Promise.resolve('/xyz/app/discover/foo#bar')),
  } as unknown) as UrlGenerator;

  const plugins: PluginDeps = {
    discover: {
      urlGenerator,
    },
    kibanaLegacy: {
      dashboardConfig: {
        getHideWriteControls: () => dashboardOnlyMode,
      },
    },
  };

  const params: Params = {
    start: () => ({
      plugins,
      self: {},
      core,
    }),
  };
  const action = new ExploreDataChartAction(params);

  const input = {
    viewMode: ViewMode.VIEW,
  };

  const output = {
    indexPatterns: [
      {
        id: 'index-ptr-foo',
      },
    ],
  };

  const embeddable: VisualizeEmbeddableContract = ({
    type: VISUALIZE_EMBEDDABLE_TYPE,
    getInput: () => input,
    getOutput: () => output,
  } as unknown) as VisualizeEmbeddableContract;

  const context = {
    filters,
    timeFieldName,
    embeddable,
  } as ExploreDataChartActionContext;

  return { core, plugins, urlGenerator, params, action, input, output, embeddable, context };
};

describe('"Explore underlying data" panel action', () => {
  test('action has Discover icon', () => {
    const { action, context } = setup();
    expect(action.getIconType(context)).toBe('discoverApp');
  });

  test('title is "Explore underlying data"', () => {
    const { action, context } = setup();
    expect(action.getDisplayName(context)).toBe('Explore underlying data');
  });

  test('translates title', () => {
    expect(i18nTranslateSpy).toHaveBeenCalledTimes(0);

    const { action, context } = setup();
    action.getDisplayName(context);

    expect(i18nTranslateSpy).toHaveBeenCalledTimes(1);
    expect(i18nTranslateSpy.mock.calls[0][0]).toBe(
      'xpack.discover.FlyoutCreateDrilldownAction.displayName'
    );
  });

  describe('isCompatible()', () => {
    test('returns true when all conditions are met', async () => {
      const { action, context } = setup();

      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(true);
    });

    test('returns false when URL generator is not present', async () => {
      const { action, plugins, context } = setup();
      (plugins.discover as any).urlGenerator = undefined;

      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(false);
    });

    test('returns false if embeddable has more than one index pattern', async () => {
      const { action, output, context } = setup();
      output.indexPatterns = [
        {
          id: 'index-ptr-foo',
        },
        {
          id: 'index-ptr-bar',
        },
      ];

      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(false);
    });

    test('returns false if embeddable does not have index patterns', async () => {
      const { action, output, context } = setup();
      // @ts-expect-error
      delete output.indexPatterns;

      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(false);
    });

    test('returns false if embeddable index patterns are empty', async () => {
      const { action, output, context } = setup();
      output.indexPatterns = [];

      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(false);
    });

    test('returns false if dashboard is in edit mode', async () => {
      const { action, input, context } = setup();
      input.viewMode = ViewMode.EDIT;

      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(false);
    });

    test('return false for dashboard_only mode', async () => {
      const { action, context } = setup({ dashboardOnlyMode: true });
      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(false);
    });

    test('returns false if Discover app is disabled', async () => {
      const { action, context, core } = setup();

      core.application.capabilities = { ...core.application.capabilities };
      (core.application.capabilities as any).discover = {
        show: false,
      };

      const isCompatible = await action.isCompatible(context);

      expect(isCompatible).toBe(false);
    });
  });

  describe('getHref()', () => {
    test('returns URL path generated by URL generator', async () => {
      const { action, context } = setup();

      const href = await action.getHref(context);

      expect(href).toBe('/xyz/app/discover/foo#bar');
    });

    test('calls URL generator with right arguments', async () => {
      const { action, urlGenerator, context } = setup();

      expect(urlGenerator.createUrl).toHaveBeenCalledTimes(0);

      await action.getHref(context);

      expect(urlGenerator.createUrl).toHaveBeenCalledTimes(1);
      expect(urlGenerator.createUrl).toHaveBeenCalledWith({
        filters: [],
        indexPatternId: 'index-ptr-foo',
        timeRange: undefined,
      });
    });

    test('applies chart event filters', async () => {
      const timeFieldName = 'timeField';
      const from = '2020-07-13T13:40:43.583Z';
      const to = '2020-07-13T13:44:43.583Z';
      const filters: Array<Filter | RangeFilter> = [
        {
          meta: {
            alias: 'alias',
            disabled: false,
            negate: false,
          },
        },
        {
          meta: {
            alias: 'alias',
            disabled: false,
            negate: false,
            field: timeFieldName,
            params: {
              gte: from,
              lte: to,
            },
          },
          range: {
            [timeFieldName]: {
              gte: from,
              lte: to,
            },
          },
        },
      ];

      const { action, context, urlGenerator } = setup({ filters, timeFieldName });

      await action.getHref(context);

      expect(urlGenerator.createUrl).toHaveBeenCalledWith({
        filters: [
          {
            meta: {
              alias: 'alias',
              disabled: false,
              negate: false,
            },
          },
        ],
        indexPatternId: 'index-ptr-foo',
        timeRange: {
          from,
          to,
        },
      });
    });
  });

  describe('execute()', () => {
    test('calls platform SPA navigation method', async () => {
      const { action, context, core } = setup();

      expect(core.application.navigateToApp).toHaveBeenCalledTimes(0);

      await action.execute(context);

      expect(core.application.navigateToApp).toHaveBeenCalledTimes(1);
    });

    test('calls platform SPA navigation method with right arguments', async () => {
      const { action, context, core } = setup();

      await action.execute(context);

      expect(core.application.navigateToApp).toHaveBeenCalledTimes(1);
      expect(core.application.navigateToApp.mock.calls[0]).toEqual([
        'discover',
        {
          path: '/foo#bar',
        },
      ]);
    });
  });
});
