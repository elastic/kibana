/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentServiceMock } from '../../../services/mocks';
import { AlertLimiter } from './alerts';
import { createAlertRequests, createUserRequests } from '../test_utils';

describe('AlertLimiter', () => {
  const alert = new AlertLimiter();

  describe('public fields', () => {
    it('sets the errorMessage to the 1k limit', () => {
      expect(alert.errorMessage).toMatchInlineSnapshot(
        `"Case has reached the maximum allowed number (1000) of attached alerts."`
      );
    });

    it('sets the limit to 1k', () => {
      expect(alert.limit).toBe(1000);
    });
  });

  describe('countOfItemsInRequest', () => {
    it('returns 0 when passed an empty array', () => {
      expect(alert.countOfItemsInRequest([])).toBe(0);
    });

    it('returns 0 when the requests are not for alerts', () => {
      expect(alert.countOfItemsInRequest(createUserRequests(2))).toBe(0);
    });

    it('returns 2 when there are 2 alert requests', () => {
      expect(alert.countOfItemsInRequest(createAlertRequests(2, 'alert-id'))).toBe(2);
    });

    it('returns 2 when there is 1 request with 2 alert ids', () => {
      expect(alert.countOfItemsInRequest(createAlertRequests(1, ['alert-id', 'alert-id2']))).toBe(
        2
      );
    });

    it('returns 3 when there is 1 request with 2 alert ids and 1 request with 1 alert id', () => {
      const requestWith2AlertIds = createAlertRequests(1, ['alert-id', 'alert-id2']);
      const requestWith1AlertId = createAlertRequests(1, 'alert-id');
      expect(alert.countOfItemsInRequest([...requestWith2AlertIds, ...requestWith1AlertId])).toBe(
        3
      );
    });

    it('returns 2 when there are 2 requests with an alert id and 1 user comment request', () => {
      expect(
        alert.countOfItemsInRequest([
          ...createUserRequests(1),
          ...createAlertRequests(2, 'alert-id'),
        ])
      ).toBe(2);
    });
  });

  describe('countOfItemsWithinCase', () => {
    const attachmentService = createAttachmentServiceMock();
    attachmentService.executeCaseAggregations.mockImplementation(async () => {
      return {
        limiter: {
          value: 5,
        },
      };
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls the aggregation function with the correct arguments', async () => {
      await alert.countOfItemsWithinCase(attachmentService, 'id');

      expect(attachmentService.executeCaseAggregations.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "aggregations": Object {
              "limiter": Object {
                "value_count": Object {
                  "field": "cases-comments.attributes.alertId",
                },
              },
            },
            "attachmentType": "alert",
            "caseId": "id",
            "filter": undefined,
          },
        ]
      `);
    });

    it('returns 5', async () => {
      expect(await alert.countOfItemsWithinCase(attachmentService, 'id')).toBe(5);
    });
  });
});
