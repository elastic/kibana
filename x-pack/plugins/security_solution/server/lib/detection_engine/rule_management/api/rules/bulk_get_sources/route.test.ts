/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DETECTION_ENGINE_RULES_BULK_GET_SOURCES,
  RULES_TABLE_MAX_PAGE_SIZE,
} from '../../../../../../../common/constants';
import {
  getEmptyFindResult,
  getFindResultWithMultiHits,
  getBulkGetSourcesRequest,
  getRuleMock,
} from '../../../../routes/__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../../../../routes/__mocks__';
import { performBulkGetRulesSourcesRoute } from './route';
import { getPerformBulkGetSourcesSchemaMock } from '../../../../../../../common/api/detection_engine/rule_management/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getNewTermsRuleParams, getQueryRuleParams } from '../../../../rule_schema/mocks';

describe('Perform bulk get sources route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    const rule1 = getRuleMock(getQueryRuleParams({ ruleId: 'rule-1' }));
    const rule2 = getRuleMock(getNewTermsRuleParams({ ruleId: 'rule-2' }));

    // Rule with data view instead of index patterns
    const { index, ...restRuleParams } = getQueryRuleParams({ ruleId: 'rule-3' });
    const rule3 = getRuleMock({ ...restRuleParams, dataViewId: 'dataView1' });

    clients.rulesClient.find.mockResolvedValue(
      getFindResultWithMultiHits({
        data: [rule1, rule2, rule3],
      })
    );
    performBulkGetRulesSourcesRoute(server.router, undefined, logger);
  });

  describe('status codes', () => {
    it('should return 200 when performing bulk get sources with all dependencies present', async () => {
      const response = await server.inject(
        getBulkGetSourcesRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        dataViewIds: ['dataView1'],
        indexPatterns: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      });
    });

    it("should return 200 when provided filter query doesn't match any rules", async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(
        getBulkGetSourcesRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        dataViewIds: [],
        indexPatterns: [],
      });
    });

    it('should return 400 when provided filter query matches too many rules', async () => {
      clients.rulesClient.find.mockResolvedValue(
        getFindResultWithMultiHits({ data: [], total: Infinity })
      );
      const response = await server.inject(
        getBulkGetSourcesRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: 'More than 10000 rules matched the filter query. Try to narrow it down.',
        status_code: 400,
      });
    });
  });

  describe('request validation', () => {
    it('should accept payload with no query and no ids', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_GET_SOURCES,
        body: { ...getPerformBulkGetSourcesSchemaMock(), query: undefined, ids: undefined },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    it(`should reject payload if there is more than "${RULES_TABLE_MAX_PAGE_SIZE}" ids in payload`, async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_GET_SOURCES,
        body: {
          ...getPerformBulkGetSourcesSchemaMock(),
          query: undefined,
          ids: Array.from({ length: RULES_TABLE_MAX_PAGE_SIZE + 1 }).map(() => 'fake-id'),
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body.message).toEqual(
        `More than ${RULES_TABLE_MAX_PAGE_SIZE} ids sent for bulk get sources.`
      );
    });

    it('should reject payload if both query and ids defined', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_GET_SOURCES,
        body: {
          ...getPerformBulkGetSourcesSchemaMock(),
          query: '',
          ids: ['fake-id'],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body.message).toEqual(
        'Both query and ids are sent. Define either ids or query in request payload.'
      );
    });

    it('should reject payload if ids is empty', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_GET_SOURCES,
        body: { ...getPerformBulkGetSourcesSchemaMock(), ids: [] },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        'ids: Array must contain at least 1 element(s)'
      );
    });
  });

  it('should process large number of rules, larger than configured concurrency', async () => {
    const rulesNumber = 2 * RULES_TABLE_MAX_PAGE_SIZE;
    const rulesWithIndex = Array.from({ length: RULES_TABLE_MAX_PAGE_SIZE }).map((_, idx) =>
      getRuleMock({ ...getQueryRuleParams(), index: [`index-${idx + 1}`] })
    );
    const rulesWithDataView = Array.from({ length: RULES_TABLE_MAX_PAGE_SIZE }).map((_, idx) =>
      getRuleMock({
        ...getQueryRuleParams(),
        index: undefined,
        dataViewId: `dataViewId-${idx + 1}`,
      })
    );
    clients.rulesClient.find.mockResolvedValue(
      getFindResultWithMultiHits({
        data: [...rulesWithIndex, ...rulesWithDataView],
        total: rulesNumber,
      })
    );

    const response = await server.inject(
      getBulkGetSourcesRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        dataViewIds: Array.from({ length: RULES_TABLE_MAX_PAGE_SIZE }).map(
          (_, idx) => `dataViewId-${idx + 1}`
        ),
        indexPatterns: Array.from({ length: RULES_TABLE_MAX_PAGE_SIZE }).map(
          (_, idx) => `index-${idx + 1}`
        ),
      })
    );
  });
});
