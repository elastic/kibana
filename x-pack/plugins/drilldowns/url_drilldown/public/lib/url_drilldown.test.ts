/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IExternalUrl } from 'src/core/public';
import { uiSettingsServiceMock } from 'src/core/public/mocks';
import { UrlDrilldown, ActionContext, Config } from './url_drilldown';
import {
  IEmbeddable,
  VALUE_CLICK_TRIGGER,
  SELECT_RANGE_TRIGGER,
  CONTEXT_MENU_TRIGGER,
} from '../../../../../../src/plugins/embeddable/public';
import { DatatableColumnType } from '../../../../../../src/plugins/expressions/common';
import { of } from '../../../../../../src/plugins/kibana_utils';
import { createPoint, rowClickData, TestEmbeddable } from './test/data';
import { ROW_CLICK_TRIGGER } from '../../../../../../src/plugins/ui_actions/public';

const mockDataPoints = [
  {
    table: {
      columns: [
        {
          name: 'test',
          id: '1-1',
          meta: {
            type: 'number' as DatatableColumnType,
            field: 'bytes',
            index: 'logstash-*',
            sourceParams: {
              indexPatternId: 'logstash-*',
              type: 'histogram',
              params: {
                field: 'bytes',
                interval: 30,
                otherBucket: true,
              },
            },
          },
        },
      ],
      rows: [
        {
          '1-1': '2048',
        },
      ],
    },
    column: 0,
    row: 0,
    value: 'test',
  },
];

const mockEmbeddable = {
  getInput: () => ({
    filters: [],
    timeRange: { from: 'now-15m', to: 'now' },
    query: { query: 'test', language: 'kuery' },
  }),
  getOutput: () => ({}),
} as unknown as IEmbeddable;

const mockNavigateToUrl = jest.fn(() => Promise.resolve());

class TextExternalUrl implements IExternalUrl {
  constructor(private readonly isCorrect: boolean = true) {}

  public isInternalUrl(url: string): boolean {
    return false;
  }

  public validateUrl(url: string): URL | null {
    return this.isCorrect ? new URL(url) : null;
  }
}

const createDrilldown = (isExternalUrlValid: boolean = true) => {
  const drilldown = new UrlDrilldown({
    externalUrl: new TextExternalUrl(isExternalUrlValid),
    getGlobalScope: () => ({ kibanaUrl: 'http://localhost:5601/' }),
    getSyntaxHelpDocsLink: () => 'http://localhost:5601/docs',
    getVariablesHelpDocsLink: () => 'http://localhost:5601/docs',
    navigateToUrl: mockNavigateToUrl,
    uiSettings: uiSettingsServiceMock.createSetupContract(),
  });
  return drilldown;
};

describe('UrlDrilldown', () => {
  const urlDrilldown = createDrilldown();

  test('license', () => {
    expect(urlDrilldown.minimalLicense).toBe('gold');
  });

  describe('isCompatible', () => {
    test('throws if no embeddable', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}`,
        },
        openInNewTab: false,
      };

      const context: ActionContext = {
        data: {
          data: mockDataPoints,
        },
      };

      await expect(urlDrilldown.isCompatible(config, context)).rejects.toThrowError();
    });

    test('compatible if url is valid', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.query}}`,
        },
        openInNewTab: false,
      };

      const context: ActionContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddable,
      };

      const result = urlDrilldown.isCompatible(config, context);
      await expect(result).resolves.toBe(true);
    });

    test('not compatible if url is invalid', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.somethingFake}}`,
        },
        openInNewTab: false,
      };

      const context: ActionContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddable,
      };

      await expect(urlDrilldown.isCompatible(config, context)).resolves.toBe(false);
    });

    test('not compatible if external URL is denied', async () => {
      const drilldown1 = createDrilldown(true);
      const drilldown2 = createDrilldown(false);
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.query}}`,
        },
        openInNewTab: false,
      };

      const context: ActionContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddable,
      };

      const result1 = await drilldown1.isCompatible(config, context);
      const result2 = await drilldown2.isCompatible(config, context);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('getHref & execute', () => {
    beforeEach(() => {
      mockNavigateToUrl.mockReset();
    });

    test('valid url', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.query}}`,
        },
        openInNewTab: false,
      };

      const context: ActionContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddable,
      };

      const url = await urlDrilldown.getHref(config, context);
      expect(url).toMatchInlineSnapshot(`"https://elasti.co/?test&(language:kuery,query:test)"`);

      await urlDrilldown.execute(config, context);
      expect(mockNavigateToUrl).toBeCalledWith(url);
    });

    test('invalid url', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.invalid}}`,
        },
        openInNewTab: false,
      };

      const context: ActionContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddable,
      };

      await expect(urlDrilldown.getHref(config, context)).rejects.toThrowError();
      await expect(urlDrilldown.execute(config, context)).rejects.toThrowError();
      expect(mockNavigateToUrl).not.toBeCalled();
    });

    test('should throw on denied external URL', async () => {
      const drilldown1 = createDrilldown(true);
      const drilldown2 = createDrilldown(false);
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.query}}`,
        },
        openInNewTab: false,
      };

      const context: ActionContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddable,
      };

      const url = await drilldown1.getHref(config, context);
      await drilldown1.execute(config, context);

      expect(url).toMatchInlineSnapshot(`"https://elasti.co/?test&(language:kuery,query:test)"`);
      expect(mockNavigateToUrl).toBeCalledWith(url);

      const [, error1] = await of(drilldown2.getHref(config, context));
      const [, error2] = await of(drilldown2.execute(config, context));

      expect(error1).toBeInstanceOf(Error);
      expect(error1.message).toMatchInlineSnapshot(
        `"External URL [https://elasti.co/?test&(language:kuery,query:test)] was denied by ExternalUrl service. You can configure external URL policies using \\"externalUrl.policy\\" setting in kibana.yml."`
      );
      expect(error2).toBeInstanceOf(Error);
      expect(error2.message).toMatchInlineSnapshot(
        `"External URL [https://elasti.co/?test&(language:kuery,query:test)] was denied by ExternalUrl service. You can configure external URL policies using \\"externalUrl.policy\\" setting in kibana.yml."`
      );
    });
  });

  describe('variables', () => {
    const embeddable1 = new TestEmbeddable(
      {
        id: 'test',
        title: 'The Title',
        savedObjectId: 'SAVED_OBJECT_IDxx',
      },
      {
        indexPatterns: [{ id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }],
      }
    );
    const data = {
      data: [
        createPoint({ field: 'field0', value: 'value0' }),
        createPoint({ field: 'field1', value: 'value1' }),
        createPoint({ field: 'field2', value: 'value2' }),
      ],
    };

    const embeddable2 = new TestEmbeddable(
      {
        id: 'the-id',
        query: {
          language: 'C++',
          query: 'std::cout << 123;',
        },
        timeRange: {
          from: 'FROM',
          to: 'TO',
        },
        filters: [
          {
            meta: {
              alias: 'asdf',
              disabled: false,
              negate: false,
            },
          },
        ],
        savedObjectId: 'SAVED_OBJECT_ID',
      },
      {
        title: 'The Title',
        indexPatterns: [
          { id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
          { id: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy' },
        ],
      }
    );

    describe('getRuntimeVariables()', () => {
      test('builds runtime variables for VALUE_CLICK_TRIGGER trigger', () => {
        const variables = urlDrilldown.getRuntimeVariables({
          embeddable: embeddable1,
          data,
        });

        expect(variables).toMatchObject({
          kibanaUrl: 'http://localhost:5601/',
          context: {
            panel: {
              id: 'test',
              title: 'The Title',
              savedObjectId: 'SAVED_OBJECT_IDxx',
              indexPatternId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            },
          },
          event: {
            key: 'field0',
            value: 'value0',
            negate: false,
            points: [
              {
                value: 'value0',
                key: 'field0',
              },
              {
                value: 'value1',
                key: 'field1',
              },
              {
                value: 'value2',
                key: 'field2',
              },
            ],
          },
        });
      });

      test('builds runtime variables for ROW_CLICK_TRIGGER trigger', () => {
        const variables = urlDrilldown.getRuntimeVariables({
          embeddable: embeddable2,
          data: rowClickData as any,
        });

        expect(variables).toMatchObject({
          kibanaUrl: 'http://localhost:5601/',
          context: {
            panel: {
              id: 'the-id',
              title: 'The Title',
              savedObjectId: 'SAVED_OBJECT_ID',
              query: {
                language: 'C++',
                query: 'std::cout << 123;',
              },
              timeRange: {
                from: 'FROM',
                to: 'TO',
              },
              filters: [
                {
                  meta: {
                    alias: 'asdf',
                    disabled: false,
                    negate: false,
                  },
                },
              ],
            },
          },
          event: {
            rowIndex: 1,
            values: ['IT', '2.25', 3, 0, 2],
            keys: ['DestCountry', 'FlightTimeHour', '', 'DistanceMiles', 'OriginAirportID'],
            columnNames: [
              'Top values of DestCountry',
              'Top values of FlightTimeHour',
              'Count of records',
              'Average of DistanceMiles',
              'Unique count of OriginAirportID',
            ],
          },
        });
      });
    });

    describe('getVariableList()', () => {
      test('builds variable list for VALUE_CLICK_TRIGGER trigger', () => {
        const list = urlDrilldown.getVariableList({
          triggers: [VALUE_CLICK_TRIGGER],
          embeddable: embeddable1,
        });

        const expectedList = [
          'event.key',
          'event.value',
          'event.negate',
          'event.points',

          'context.panel.id',
          'context.panel.title',
          'context.panel.indexPatternId',
          'context.panel.savedObjectId',

          'kibanaUrl',
        ];

        for (const expectedItem of expectedList) {
          expect(!!list.find(({ label }) => label === expectedItem)).toBe(true);
        }
      });

      test('builds variable list for ROW_CLICK_TRIGGER trigger', () => {
        const list = urlDrilldown.getVariableList({
          triggers: [ROW_CLICK_TRIGGER],
          embeddable: embeddable2,
        });

        const expectedList = [
          'event.columnNames',
          'event.keys',
          'event.rowIndex',
          'event.values',

          'context.panel.id',
          'context.panel.title',
          'context.panel.filters',
          'context.panel.query.language',
          'context.panel.query.query',
          'context.panel.indexPatternIds',
          'context.panel.savedObjectId',
          'context.panel.timeRange.from',
          'context.panel.timeRange.to',

          'kibanaUrl',
        ];

        for (const expectedItem of expectedList) {
          expect(!!list.find(({ label }) => label === expectedItem)).toBe(true);
        }
      });
    });
  });

  describe('example url', () => {
    it('provides the expected example urls based on the trigger', () => {
      expect(urlDrilldown.getExampleUrl({ triggers: [] })).toMatchInlineSnapshot(
        `"https://www.example.com/?{{event.key}}={{event.value}}"`
      );

      expect(urlDrilldown.getExampleUrl({ triggers: ['unknown'] })).toMatchInlineSnapshot(
        `"https://www.example.com/?{{event.key}}={{event.value}}"`
      );

      expect(urlDrilldown.getExampleUrl({ triggers: [VALUE_CLICK_TRIGGER] })).toMatchInlineSnapshot(
        `"https://www.example.com/?{{event.key}}={{event.value}}"`
      );

      expect(
        urlDrilldown.getExampleUrl({ triggers: [SELECT_RANGE_TRIGGER] })
      ).toMatchInlineSnapshot(`"https://www.example.com/?from={{event.from}}&to={{event.to}}"`);

      expect(urlDrilldown.getExampleUrl({ triggers: [ROW_CLICK_TRIGGER] })).toMatchInlineSnapshot(
        `"https://www.example.com/keys={{event.keys}}&values={{event.values}}"`
      );

      expect(
        urlDrilldown.getExampleUrl({ triggers: [CONTEXT_MENU_TRIGGER] })
      ).toMatchInlineSnapshot(`"https://www.example.com/?panel={{context.panel.title}}"`);
    });
  });
});

describe('encoding', () => {
  const urlDrilldown = createDrilldown();
  const context: ActionContext = {
    data: {
      data: mockDataPoints,
    },
    embeddable: mockEmbeddable,
  };

  test('encodes URL by default', async () => {
    const config: Config = {
      url: {
        template: 'https://elastic.co?foo=head%26shoulders',
      },
      openInNewTab: false,
    };
    const url = await urlDrilldown.getHref(config, context);

    expect(url).toBe('https://elastic.co?foo=head%2526shoulders');
  });

  test('encodes URL when encoding is enabled', async () => {
    const config: Config = {
      url: {
        template: 'https://elastic.co?foo=head%26shoulders',
      },
      openInNewTab: false,
      encodeUrl: true,
    };
    const url = await urlDrilldown.getHref(config, context);

    expect(url).toBe('https://elastic.co?foo=head%2526shoulders');
  });

  test('does not encode URL when encoding is not enabled', async () => {
    const config: Config = {
      url: {
        template: 'https://elastic.co?foo=head%26shoulders',
      },
      openInNewTab: false,
      encodeUrl: false,
    };
    const url = await urlDrilldown.getHref(config, context);

    expect(url).toBe('https://elastic.co?foo=head%26shoulders');
  });

  test('can encode URI component using "encodeURIComponent" Handlebars helper', async () => {
    const config: Config = {
      url: {
        template: 'https://elastic.co?foo={{encodeURIComponent "head%26shoulders@gmail.com"}}',
      },
      openInNewTab: false,
      encodeUrl: false,
    };
    const url = await urlDrilldown.getHref(config, context);

    expect(url).toBe('https://elastic.co?foo=head%2526shoulders%40gmail.com');
  });

  test('can encode URI component using "encodeURIQuery" Handlebars helper', async () => {
    const config: Config = {
      url: {
        template: 'https://elastic.co?foo={{encodeURIQuery "head%26shoulders@gmail.com"}}',
      },
      openInNewTab: false,
      encodeUrl: false,
    };
    const url = await urlDrilldown.getHref(config, context);

    expect(url).toBe('https://elastic.co?foo=head%2526shoulders@gmail.com');
  });
});
