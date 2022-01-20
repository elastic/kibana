/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common/api';
import { AlertService, AlertServiceContract } from '.';
import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';
import { ALERT_WORKFLOW_STATUS } from '../../../../rule_registry/common/technical_rule_data_field_names';

describe('updateAlertsStatus', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.create().get('case');

  describe('happy path', () => {
    let alertService: AlertServiceContract;

    beforeEach(async () => {
      alertService = new AlertService();
      jest.resetAllMocks();
    });

    it('updates the status of the alert correctly', async () => {
      const args = {
        alerts: [{ id: 'alert-id-1', index: '.siem-signals', status: CaseStatuses.closed }],
        scopedClusterClient: esClient,
        logger,
      };

      await alertService.updateAlertsStatus(args);

      expect(esClient.updateByQuery).toHaveBeenCalledWith({
        index: '.siem-signals',
        conflicts: 'abort',
        body: {
          script: {
            source: `if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
              ctx._source['${ALERT_WORKFLOW_STATUS}'] = 'closed'
            }
            if (ctx._source.signal != null && ctx._source.signal.status != null) {
              ctx._source.signal.status = 'closed'
            }`,
            lang: 'painless',
          },
          query: {
            ids: {
              values: ['alert-id-1'],
            },
          },
        },
        ignore_unavailable: true,
      });
    });

    it('buckets the alerts by index', async () => {
      const args = {
        alerts: [
          { id: 'id1', index: '1', status: CaseStatuses.closed },
          { id: 'id2', index: '1', status: CaseStatuses.closed },
        ],
        scopedClusterClient: esClient,
        logger,
      };

      await alertService.updateAlertsStatus(args);

      expect(esClient.updateByQuery).toBeCalledTimes(1);
      expect(esClient.updateByQuery).toHaveBeenCalledWith({
        index: '1',
        conflicts: 'abort',
        body: {
          script: {
            source: `if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
              ctx._source['${ALERT_WORKFLOW_STATUS}'] = 'closed'
            }
            if (ctx._source.signal != null && ctx._source.signal.status != null) {
              ctx._source.signal.status = 'closed'
            }`,
            lang: 'painless',
          },
          query: {
            ids: {
              values: ['id1', 'id2'],
            },
          },
        },
        ignore_unavailable: true,
      });
    });

    it('translates in-progress to acknowledged', async () => {
      const args = {
        alerts: [{ id: 'id1', index: '1', status: CaseStatuses['in-progress'] }],
        scopedClusterClient: esClient,
        logger,
      };

      await alertService.updateAlertsStatus(args);

      expect(esClient.updateByQuery).toBeCalledTimes(1);
      expect(esClient.updateByQuery.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "body": Object {
              "query": Object {
                "ids": Object {
                  "values": Array [
                    "id1",
                  ],
                },
              },
              "script": Object {
                "lang": "painless",
                "source": "if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
                      ctx._source['${ALERT_WORKFLOW_STATUS}'] = 'acknowledged'
                    }
                    if (ctx._source.signal != null && ctx._source.signal.status != null) {
                      ctx._source.signal.status = 'acknowledged'
                    }",
              },
            },
            "conflicts": "abort",
            "ignore_unavailable": true,
            "index": "1",
          },
        ]
      `);
    });

    it('makes two calls when the statuses are different', async () => {
      const args = {
        alerts: [
          { id: 'id1', index: '1', status: CaseStatuses.closed },
          { id: 'id2', index: '1', status: CaseStatuses.open },
        ],
        scopedClusterClient: esClient,
        logger,
      };

      await alertService.updateAlertsStatus(args);

      expect(esClient.updateByQuery).toBeCalledTimes(2);
      // id1 should be closed
      expect(esClient.updateByQuery.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "body": Object {
              "query": Object {
                "ids": Object {
                  "values": Array [
                    "id1",
                  ],
                },
              },
              "script": Object {
                "lang": "painless",
                "source": "if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
                      ctx._source['${ALERT_WORKFLOW_STATUS}'] = 'closed'
                    }
                    if (ctx._source.signal != null && ctx._source.signal.status != null) {
                      ctx._source.signal.status = 'closed'
                    }",
              },
            },
            "conflicts": "abort",
            "ignore_unavailable": true,
            "index": "1",
          },
        ]
      `);

      // id2 should be open
      expect(esClient.updateByQuery.mock.calls[1]).toMatchInlineSnapshot(`
        Array [
          Object {
            "body": Object {
              "query": Object {
                "ids": Object {
                  "values": Array [
                    "id2",
                  ],
                },
              },
              "script": Object {
                "lang": "painless",
                "source": "if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
                      ctx._source['${ALERT_WORKFLOW_STATUS}'] = 'open'
                    }
                    if (ctx._source.signal != null && ctx._source.signal.status != null) {
                      ctx._source.signal.status = 'open'
                    }",
              },
            },
            "conflicts": "abort",
            "ignore_unavailable": true,
            "index": "1",
          },
        ]
      `);
    });

    it('makes two calls when the indices are different', async () => {
      const args = {
        alerts: [
          { id: 'id1', index: '1', status: CaseStatuses.closed },
          { id: 'id2', index: '2', status: CaseStatuses.open },
        ],
        scopedClusterClient: esClient,
        logger,
      };

      await alertService.updateAlertsStatus(args);

      expect(esClient.updateByQuery).toBeCalledTimes(2);
      // id1 should be closed in index 1
      expect(esClient.updateByQuery.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "body": Object {
              "query": Object {
                "ids": Object {
                  "values": Array [
                    "id1",
                  ],
                },
              },
              "script": Object {
                "lang": "painless",
                "source": "if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
                      ctx._source['${ALERT_WORKFLOW_STATUS}'] = 'closed'
                    }
                    if (ctx._source.signal != null && ctx._source.signal.status != null) {
                      ctx._source.signal.status = 'closed'
                    }",
              },
            },
            "conflicts": "abort",
            "ignore_unavailable": true,
            "index": "1",
          },
        ]
      `);

      // id2 should be open in index 2
      expect(esClient.updateByQuery.mock.calls[1]).toMatchInlineSnapshot(`
        Array [
          Object {
            "body": Object {
              "query": Object {
                "ids": Object {
                  "values": Array [
                    "id2",
                  ],
                },
              },
              "script": Object {
                "lang": "painless",
                "source": "if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
                      ctx._source['${ALERT_WORKFLOW_STATUS}'] = 'open'
                    }
                    if (ctx._source.signal != null && ctx._source.signal.status != null) {
                      ctx._source.signal.status = 'open'
                    }",
              },
            },
            "conflicts": "abort",
            "ignore_unavailable": true,
            "index": "2",
          },
        ]
      `);
    });

    it('ignores empty indices', async () => {
      await alertService.updateAlertsStatus({
        alerts: [{ id: 'alert-id-1', index: '', status: CaseStatuses.open }],
        scopedClusterClient: esClient,
        logger,
      });

      expect(esClient.updateByQuery).not.toHaveBeenCalled();
    });
  });
});
