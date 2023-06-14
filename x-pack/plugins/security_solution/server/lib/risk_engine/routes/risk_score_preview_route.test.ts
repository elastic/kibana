/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';

import { RISK_SCORE_PREVIEW_URL } from '../../../../common/constants';
import { RiskCategories, RiskWeightTypes } from '../../../../common/risk_engine';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../detection_engine/routes/__mocks__';
import { riskScoreService } from '../risk_score_service';
import { riskScoreServiceMock } from '../risk_score_service.mock';
import { riskScorePreviewRoute } from './risk_score_preview_route';

jest.mock('../risk_score_service');

describe('POST risk_engine/preview route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggerMock.create>;
  let mockRiskScoreService: ReturnType<typeof riskScoreServiceMock.create>;

  beforeEach(() => {
    jest.resetAllMocks();

    server = serverMock.create();
    logger = loggerMock.create();
    ({ clients, context } = requestContextMock.createTools());
    mockRiskScoreService = riskScoreServiceMock.create();

    clients.appClient.getAlertsIndex.mockReturnValue('default-alerts-index');
    (riskScoreService as jest.Mock).mockReturnValue(mockRiskScoreService);

    riskScorePreviewRoute(server.router, logger);
  });

  const buildRequest = (body: object = {}) =>
    requestMock.create({
      method: 'get',
      path: RISK_SCORE_PREVIEW_URL,
      body,
    });

  describe('parameters', () => {
    describe('index / dataview', () => {
      it('defaults to scoring the alerts index if no dataview is provided', async () => {
        const request = buildRequest();

        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.getScores).toHaveBeenCalledWith(
          expect.objectContaining({ index: 'default-alerts-index' })
        );
      });

      it('respects the provided dataview', async () => {
        const request = buildRequest({ data_view_id: 'custom-dataview-id' });

        // mock call to get dataview title
        clients.savedObjectsClient.get.mockResolvedValueOnce({
          id: '',
          type: '',
          references: [],
          attributes: { title: 'custom-dataview-index' },
        });
        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.getScores).toHaveBeenCalledWith(
          expect.objectContaining({ index: 'custom-dataview-index' })
        );
      });

      it('returns a 404 if dataview is not found', async () => {
        const request = buildRequest({ data_view_id: 'custom-dataview-id' });

        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(404);
        expect(response.body.message).toEqual(
          'The specified dataview (custom-dataview-id) was not found. Please use an existing dataview, or omit the parameter to use the default risk inputs.'
        );
        expect(mockRiskScoreService.getScores).not.toHaveBeenCalled();
      });
    });

    describe('date range', () => {
      it('defaults to the last 15 days of data', async () => {
        const request = buildRequest();
        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.getScores).toHaveBeenCalledWith(
          expect.objectContaining({ range: { start: 'now-15d', end: 'now' } })
        );
      });

      it('respects the provided range if provided', async () => {
        const request = buildRequest({ range: { start: 'now-30d', end: 'now-20d' } });
        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.getScores).toHaveBeenCalledWith(
          expect.objectContaining({ range: { start: 'now-30d', end: 'now-20d' } })
        );
      });

      it('rejects an invalid date range', async () => {
        const request = buildRequest({
          range: { end: 'now' },
        });

        const result = await server.validate(request);
        expect(result.badRequest).toHaveBeenCalledWith(
          expect.stringContaining('Invalid value "undefined" supplied to "range,start"')
        );
      });
    });

    describe('data filter', () => {
      it('respects the provided filter if provided', async () => {
        const request = buildRequest({
          filter: {
            bool: {
              filter: [
                {
                  ids: {
                    values: '1',
                  },
                },
              ],
            },
          },
        });
        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.getScores).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: {
              bool: {
                filter: [
                  {
                    ids: {
                      values: '1',
                    },
                  },
                ],
              },
            },
          })
        );
      });
    });

    describe('weights', () => {
      it('uses the specified weights when provided', async () => {
        const request = buildRequest({
          weights: [
            {
              type: RiskWeightTypes.riskCategory,
              value: RiskCategories.alerts,
              host: 0.1,
              user: 0.2,
            },
          ],
        });

        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.getScores).toHaveBeenCalledWith(
          expect.objectContaining({
            weights: [
              {
                type: RiskWeightTypes.riskCategory,
                value: RiskCategories.alerts,
                host: 0.1,
                user: 0.2,
              },
            ],
          })
        );
      });

      it('rejects weight values outside the 0-1 range', async () => {
        const request = buildRequest({
          weights: [
            {
              type: RiskWeightTypes.riskCategory,
              value: RiskCategories.alerts,
              host: 1.1,
            },
          ],
        });

        const result = await server.validate(request);
        expect(result.badRequest).toHaveBeenCalledWith(
          expect.stringContaining('Invalid value "1.1" supplied to "weights,host"')
        );
      });

      it('rejects unknown weight types', async () => {
        const request = buildRequest({
          weights: [
            {
              type: 'something new',
              host: 1.1,
            },
          ],
        });

        const result = await server.validate(request);
        expect(result.badRequest).toHaveBeenCalledWith(
          'Invalid value "{"type":"something new","host":1.1}" supplied to "weights"'
        );
      });
    });

    describe('pagination', () => {
      it('respects the provided after_key', async () => {
        const afterKey = { 'host.name': 'hi mom' };
        const request = buildRequest({ after_keys: { host: afterKey } });

        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.getScores).toHaveBeenCalledWith(
          expect.objectContaining({ afterKeys: { host: afterKey } })
        );
      });

      it('rejects an invalid after_key', async () => {
        const request = buildRequest({
          after_keys: {
            bad: 'key',
          },
        });

        const result = await server.validate(request);
        expect(result.badRequest).toHaveBeenCalledWith('invalid keys "bad"');
      });
    });
  });
});
