/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createCommentsMigrations,
  mergeMigrationFunctionMaps,
  migrateByValueLensVisualizations,
  removeAssociationType,
  removeRuleInformation,
  stringifyCommentWithoutTrailingNewline,
} from './comments';
import {
  getLensVisualizations,
  parseCommentString,
} from '../../../common/utils/markdown_plugins/utils';
import { CommentType } from '../../../common/api';

import { savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { makeLensEmbeddableFactory } from '@kbn/lens-plugin/server/embeddable/make_lens_embeddable_factory';
import { LensDocShape715 } from '@kbn/lens-plugin/server';
import {
  SavedObjectReference,
  SavedObjectsMigrationLogger,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core/server';
import { MigrateFunction, MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import { GENERATED_ALERT, SUB_CASE_SAVED_OBJECT } from './constants';

describe('comments migrations', () => {
  const migrations = createCommentsMigrations({
    lensEmbeddableFactory: makeLensEmbeddableFactory(() => ({}), {}),
  });

  const contextMock = savedObjectsServiceMock.createMigrationContext();

  const lensVisualizationToMigrate = {
    title: 'MyRenamedOps',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            '2': {
              columns: {
                '3': {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: { interval: 'auto', timeZone: 'Europe/Berlin' },
                },
                '4': {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: { interval: 'auto' },
                },
                '5': {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'my_unexpected_operation',
                  isBucketed: true,
                  scale: 'interval',
                  params: { timeZone: 'do not delete' },
                },
              },
              columnOrder: ['3', '4', '5'],
              incompleteColumns: {},
            },
          },
        },
      },
      visualization: {
        title: 'Empty XY chart',
        legend: { isVisible: true, position: 'right' },
        valueLabels: 'hide',
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId: '5ab74ddc-93ca-44e2-9857-ecf85c86b53e',
            accessors: [
              '5fea2a56-7b73-44b5-9a50-7f0c0c4f8fd0',
              'e5efca70-edb5-4d6d-a30a-79384066987e',
              '7ffb7bde-4f42-47ab-b74d-1b4fd8393e0f',
            ],
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            xAccessor: '2e57a41e-5a52-42d3-877f-bd211d903ef8',
          },
        ],
      },
      query: { query: '', language: 'kuery' },
      filters: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('lens embeddable migrations for by value panels', () => {
    describe('7.14.0 remove time zone from Lens visualization date histogram', () => {
      const expectedLensVisualizationMigrated = {
        title: 'MyRenamedOps',
        description: '',
        visualizationType: 'lnsXY',
        state: {
          datasourceStates: {
            indexpattern: {
              layers: {
                '2': {
                  columns: {
                    '3': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto' },
                    },
                    '4': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto' },
                    },
                    '5': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'my_unexpected_operation',
                      isBucketed: true,
                      scale: 'interval',
                      params: { timeZone: 'do not delete' },
                    },
                  },
                  columnOrder: ['3', '4', '5'],
                  incompleteColumns: {},
                },
              },
            },
          },
          visualization: {
            title: 'Empty XY chart',
            legend: { isVisible: true, position: 'right' },
            valueLabels: 'hide',
            preferredSeriesType: 'bar_stacked',
            layers: [
              {
                layerId: '5ab74ddc-93ca-44e2-9857-ecf85c86b53e',
                accessors: [
                  '5fea2a56-7b73-44b5-9a50-7f0c0c4f8fd0',
                  'e5efca70-edb5-4d6d-a30a-79384066987e',
                  '7ffb7bde-4f42-47ab-b74d-1b4fd8393e0f',
                ],
                position: 'top',
                seriesType: 'bar_stacked',
                showGridlines: false,
                xAccessor: '2e57a41e-5a52-42d3-877f-bd211d903ef8',
              },
            ],
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      };

      const expectedMigrationCommentResult = `"**Amazing**\n\n!{tooltip[Tessss](https://example.com)}\n\nbrbrbr\n\n[asdasdasdasd](http://localhost:5601/moq/app/security/timelines?timeline=(id%3A%27e4362a60-f478-11eb-a4b0-ebefce184d8d%27%2CisOpen%3A!t))\n\n!{lens{\"timeRange\":{\"from\":\"now-7d\",\"to\":\"now\",\"mode\":\"relative\"},\"attributes\":${JSON.stringify(
        expectedLensVisualizationMigrated
      )}}}\n\n!{lens{\"timeRange\":{\"from\":\"now-7d\",\"to\":\"now\",\"mode\":\"relative\"},\"attributes\":{\"title\":\"TEst22\",\"type\":\"lens\",\"visualizationType\":\"lnsMetric\",\"state\":{\"datasourceStates\":{\"indexpattern\":{\"layers\":{\"layer1\":{\"columnOrder\":[\"col2\"],\"columns\":{\"col2\":{\"dataType\":\"number\",\"isBucketed\":false,\"label\":\"Count of records\",\"operationType\":\"count\",\"scale\":\"ratio\",\"sourceField\":\"Records\"}}}}}},\"visualization\":{\"layerId\":\"layer1\",\"accessor\":\"col2\"},\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filters\":[]},\"references\":[{\"type\":\"index-pattern\",\"id\":\"90943e30-9a47-11e8-b64d-95841ca0b247\",\"name\":\"indexpattern-datasource-current-indexpattern\"},{\"type\":\"index-pattern\",\"id\":\"90943e30-9a47-11e8-b64d-95841ca0b247\",\"name\":\"indexpattern-datasource-layer-layer1\"}]}}}\n\nbrbrbr"`;

      const caseComment = {
        type: 'cases-comments',
        id: '1cefd0d0-e86d-11eb-bae5-3d065cd16a32',
        attributes: {
          associationType: 'case',
          comment: `"**Amazing**\n\n!{tooltip[Tessss](https://example.com)}\n\nbrbrbr\n\n[asdasdasdasd](http://localhost:5601/moq/app/security/timelines?timeline=(id%3A%27e4362a60-f478-11eb-a4b0-ebefce184d8d%27%2CisOpen%3A!t))\n\n!{lens{\"timeRange\":{\"from\":\"now-7d\",\"to\":\"now\",\"mode\":\"relative\"},\"editMode\":false,\"attributes\":${JSON.stringify(
            lensVisualizationToMigrate
          )}}}\n\n!{lens{\"timeRange\":{\"from\":\"now-7d\",\"to\":\"now\",\"mode\":\"relative\"},\"editMode\":false,\"attributes\":{\"title\":\"TEst22\",\"type\":\"lens\",\"visualizationType\":\"lnsMetric\",\"state\":{\"datasourceStates\":{\"indexpattern\":{\"layers\":{\"layer1\":{\"columnOrder\":[\"col2\"],\"columns\":{\"col2\":{\"dataType\":\"number\",\"isBucketed\":false,\"label\":\"Count of records\",\"operationType\":\"count\",\"scale\":\"ratio\",\"sourceField\":\"Records\"}}}}}},\"visualization\":{\"layerId\":\"layer1\",\"accessor\":\"col2\"},\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filters\":[]},\"references\":[{\"type\":\"index-pattern\",\"id\":\"90943e30-9a47-11e8-b64d-95841ca0b247\",\"name\":\"indexpattern-datasource-current-indexpattern\"},{\"type\":\"index-pattern\",\"id\":\"90943e30-9a47-11e8-b64d-95841ca0b247\",\"name\":\"indexpattern-datasource-layer-layer1\"}]}}}\n\nbrbrbr"`,
          type: 'user',
          created_at: '2021-07-19T08:41:29.951Z',
          created_by: {
            email: null,
            full_name: null,
            username: 'elastic',
          },
          pushed_at: null,
          pushed_by: null,
          updated_at: '2021-07-19T08:41:47.549Z',
          updated_by: {
            full_name: null,
            email: null,
            username: 'elastic',
          },
        },
        references: [
          {
            name: 'associated-cases',
            id: '77d1b230-d35e-11eb-8da6-6f746b9cb499',
            type: 'cases',
          },
          {
            name: 'indexpattern-datasource-current-indexpattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b247',
            type: 'index-pattern',
          },
          {
            name: 'indexpattern-datasource-current-indexpattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b247',
            type: 'index-pattern',
          },
        ],
        migrationVersion: {
          'cases-comments': '7.14.0',
        },
        coreMigrationVersion: '8.0.0',
        updated_at: '2021-07-19T08:41:47.552Z',
        version: 'WzgxMTY4MSw5XQ==',
        namespaces: ['default'],
        score: 0,
      };

      it('should remove time zone param from date histogram', () => {
        expect(migrations['7.14.0']).toBeDefined();
        const result = migrations['7.14.0'](caseComment, contextMock);

        const parsedComment = parseCommentString(result.attributes.comment);
        const lensVisualizations = getLensVisualizations(
          parsedComment.children
        ) as unknown as Array<{
          attributes: LensDocShape715 & { references: SavedObjectReference[] };
        }>;

        const layers = Object.values(
          lensVisualizations[0].attributes.state.datasourceStates.indexpattern.layers
        );
        expect(result.attributes.comment).toEqual(expectedMigrationCommentResult);
        expect(layers.length).toBe(1);
        const columns = Object.values(layers[0].columns);
        expect(columns.length).toBe(3);
        expect(columns[0].operationType).toEqual('date_histogram');
        expect((columns[0] as { params: {} }).params).toEqual({ interval: 'auto' });
        expect(columns[1].operationType).toEqual('date_histogram');
        expect((columns[1] as { params: {} }).params).toEqual({ interval: 'auto' });
        expect(columns[2].operationType).toEqual('my_unexpected_operation');
        expect((columns[2] as { params: {} }).params).toEqual({ timeZone: 'do not delete' });
      });
    });
  });

  describe('handles errors', () => {
    interface CommentSerializable extends SerializableRecord {
      comment?: string;
    }

    const migrationFunction: MigrateFunction<CommentSerializable, CommentSerializable> = (
      comment
    ) => {
      throw new Error('an error');
    };

    const comment = `!{lens{\"timeRange\":{\"from\":\"now-7d\",\"to\":\"now\",\"mode\":\"relative\"},\"editMode\":false,\"attributes\":${JSON.stringify(
      lensVisualizationToMigrate
    )}}}\n\n`;

    const caseComment = {
      type: 'cases-comments',
      id: '1cefd0d0-e86d-11eb-bae5-3d065cd16a32',
      attributes: {
        comment,
      },
      references: [],
    };

    it('logs an error when it fails to parse invalid json', () => {
      const commentMigrationFunction = migrateByValueLensVisualizations(migrationFunction, '1.0.0');

      const result = commentMigrationFunction(caseComment, contextMock);
      // the comment should remain unchanged when there is an error
      expect(result.attributes.comment).toEqual(comment);

      const log = contextMock.log as jest.Mocked<SavedObjectsMigrationLogger>;
      expect(log.error.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Failed to migrate comment with doc id: 1cefd0d0-e86d-11eb-bae5-3d065cd16a32 version: 8.0.0 error: an error",
          Object {
            "migrations": Object {
              "comment": Object {
                "id": "1cefd0d0-e86d-11eb-bae5-3d065cd16a32",
              },
            },
          },
        ]
      `);
    });

    describe('mergeMigrationFunctionMaps', () => {
      it('logs an error when the passed migration functions fails', () => {
        const migrationObj1 = {
          '1.0.0': migrateByValueLensVisualizations(migrationFunction, '1.0.0'),
        } as unknown as MigrateFunctionsObject;

        const migrationObj2 = {
          '2.0.0': (doc: SavedObjectUnsanitizedDoc<{ comment?: string }>) => {
            return doc;
          },
        };

        const mergedFunctions = mergeMigrationFunctionMaps(migrationObj1, migrationObj2);
        mergedFunctions['1.0.0'](caseComment, contextMock);

        const log = contextMock.log as jest.Mocked<SavedObjectsMigrationLogger>;
        expect(log.error.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            "Failed to migrate comment with doc id: 1cefd0d0-e86d-11eb-bae5-3d065cd16a32 version: 8.0.0 error: an error",
            Object {
              "migrations": Object {
                "comment": Object {
                  "id": "1cefd0d0-e86d-11eb-bae5-3d065cd16a32",
                },
              },
            },
          ]
        `);
      });

      it('it does not log an error when the migration function does not use the context', () => {
        const migrationObj1 = {
          '1.0.0': migrateByValueLensVisualizations(migrationFunction, '1.0.0'),
        } as unknown as MigrateFunctionsObject;

        const migrationObj2 = {
          '2.0.0': (doc: SavedObjectUnsanitizedDoc<{ comment?: string }>) => {
            throw new Error('2.0.0 error');
          },
        };

        const mergedFunctions = mergeMigrationFunctionMaps(migrationObj1, migrationObj2);

        expect(() => mergedFunctions['2.0.0'](caseComment, contextMock)).toThrow();

        const log = contextMock.log as jest.Mocked<SavedObjectsMigrationLogger>;
        expect(log.error).not.toHaveBeenCalled();
      });
    });
  });

  describe('stringifyCommentWithoutTrailingNewline', () => {
    it('removes the newline added by the markdown library when the comment did not originally have one', () => {
      const originalComment = 'awesome';
      const parsedString = parseCommentString(originalComment);

      expect(stringifyCommentWithoutTrailingNewline(originalComment, parsedString)).toEqual(
        'awesome'
      );
    });

    it('leaves the newline if it was in the original comment', () => {
      const originalComment = 'awesome\n';
      const parsedString = parseCommentString(originalComment);

      expect(stringifyCommentWithoutTrailingNewline(originalComment, parsedString)).toEqual(
        'awesome\n'
      );
    });

    it('does not remove newlines that are not at the end of the comment', () => {
      const originalComment = 'awesome\ncomment';
      const parsedString = parseCommentString(originalComment);

      expect(stringifyCommentWithoutTrailingNewline(originalComment, parsedString)).toEqual(
        'awesome\ncomment'
      );
    });

    it('does not remove spaces at the end of the comment', () => {
      const originalComment = 'awesome     ';
      const parsedString = parseCommentString(originalComment);

      expect(stringifyCommentWithoutTrailingNewline(originalComment, parsedString)).toEqual(
        'awesome     '
      );
    });
  });

  describe('removeRuleInformation', () => {
    it('does not modify non-alert comment', () => {
      const doc = {
        id: '123',
        attributes: {
          type: 'user',
        },
        type: 'abc',
        references: [],
      };

      expect(removeRuleInformation(doc)).toEqual(doc);
    });

    it('sets the rule fields to null', () => {
      const doc = {
        id: '123',
        type: 'abc',
        attributes: {
          type: CommentType.alert,
          rule: {
            id: '123',
            name: 'hello',
          },
        },
      };

      expect(removeRuleInformation(doc)).toEqual({
        ...doc,
        attributes: { ...doc.attributes, rule: { id: null, name: null } },
        references: [],
      });
    });

    it('sets the rule fields to null for a generated alert', () => {
      const doc = {
        id: '123',
        type: 'abc',
        attributes: {
          type: GENERATED_ALERT,
          rule: {
            id: '123',
            name: 'hello',
          },
        },
      };

      expect(removeRuleInformation(doc)).toEqual({
        ...doc,
        attributes: { ...doc.attributes, rule: { id: null, name: null } },
        references: [],
      });
    });

    it('preserves the references field', () => {
      const doc = {
        id: '123',
        type: 'abc',
        attributes: {
          type: CommentType.alert,
          rule: {
            id: '123',
            name: 'hello',
          },
        },
        references: [{ id: '123', name: 'hi', type: 'awesome' }],
      };

      expect(removeRuleInformation(doc)).toEqual({
        ...doc,
        attributes: { ...doc.attributes, rule: { id: null, name: null } },
      });
    });
  });

  describe('removeAssociationType', () => {
    it('removes the associationType field from the document', () => {
      const doc = {
        id: '123',
        attributes: {
          type: 'user',
          associationType: 'case',
        },
        type: 'abc',
        references: [],
      };

      expect(removeAssociationType(doc)).toEqual({
        ...doc,
        attributes: {
          type: doc.attributes.type,
        },
      });
    });

    it('removes the sub case reference', () => {
      const doc = {
        id: '123',
        attributes: {
          type: 'user',
          associationType: 'case',
        },
        type: 'abc',
        references: [
          {
            type: SUB_CASE_SAVED_OBJECT,
            id: 'test-id',
            name: 'associated-sub-case',
          },
          {
            type: 'action',
            id: 'action-id',
            name: 'action-name',
          },
        ],
      };

      expect(removeAssociationType(doc)).toEqual({
        ...doc,
        attributes: {
          type: doc.attributes.type,
        },
        references: [
          {
            type: 'action',
            id: 'action-id',
            name: 'action-name',
          },
        ],
      });
    });
  });
});
