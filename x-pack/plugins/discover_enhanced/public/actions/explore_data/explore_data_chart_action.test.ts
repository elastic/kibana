/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExploreDataChartAction } from './explore_data_chart_action';
import { Params, PluginDeps } from './abstract_explore_data_action';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { UrlGeneratorContract } from '../../../../../../src/plugins/share/public';
import {
  EmbeddableStart,
  RangeSelectContext,
  ValueClickContext,
  ChartActionContext,
} from '../../../../../../src/plugins/embeddable/public';
import { i18n } from '@kbn/i18n';
import {
  VisualizeEmbeddableContract,
  VISUALIZE_EMBEDDABLE_TYPE,
} from '../../../../../../src/plugins/visualizations/public';
import { ViewMode } from '../../../../../../src/plugins/embeddable/public';
import { Filter, TimeRange } from '../../../../../../src/plugins/data/public';

const i18nTranslateSpy = (i18n.translate as unknown) as jest.SpyInstance;

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: jest.fn((key, options) => options.defaultMessage),
  },
}));

afterEach(() => {
  i18nTranslateSpy.mockClear();
});

const setup = ({ useRangeEvent = false }: { useRangeEvent?: boolean } = {}) => {
  type UrlGenerator = UrlGeneratorContract<'DISCOVER_APP_URL_GENERATOR'>;

  const core = coreMock.createStart();

  const urlGenerator: UrlGenerator = ({
    createUrl: jest.fn(() => Promise.resolve('/xyz/app/discover/foo#bar')),
  } as unknown) as UrlGenerator;

  const filtersAndTimeRangeFromContext = jest.fn((async () => ({
    filters: [],
  })) as EmbeddableStart['filtersAndTimeRangeFromContext']);

  const plugins: PluginDeps = {
    discover: {
      urlGenerator,
    },
    embeddable: {
      filtersAndTimeRangeFromContext,
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

  const data: ChartActionContext<typeof embeddable>['data'] = {
    ...(useRangeEvent
      ? ({ range: {} } as RangeSelectContext['data'])
      : ({ data: [] } as ValueClickContext['data'])),
    timeFieldName: 'order_date',
  };

  const context = {
    embeddable,
    data,
  } as ChartActionContext<typeof embeddable>;

  return { core, plugins, urlGenerator, params, action, input, output, embeddable, data, context };
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
      const { action, context, urlGenerator, plugins } = setup();

      ((plugins.embeddable
        .filtersAndTimeRangeFromContext as unknown) as jest.SpyInstance).mockImplementation(() => {
        const filters: Filter[] = [
          {
            meta: {
              alias: 'alias',
              disabled: false,
              negate: false,
            },
          },
        ];
        const timeRange: TimeRange = {
          from: 'from',
          to: 'to',
        };
        return { filters, timeRange };
      });

      expect(plugins.embeddable.filtersAndTimeRangeFromContext).toHaveBeenCalledTimes(0);

      await action.getHref(context);

      expect(plugins.embeddable.filtersAndTimeRangeFromContext).toHaveBeenCalledTimes(1);
      expect(plugins.embeddable.filtersAndTimeRangeFromContext).toHaveBeenCalledWith(context);
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
          from: 'from',
          to: 'to',
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
