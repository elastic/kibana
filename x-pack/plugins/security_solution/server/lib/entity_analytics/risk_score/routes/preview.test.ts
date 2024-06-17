/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';

import { RISK_SCORE_PREVIEW_URL } from '../../../../../common/constants';
import { RiskWeightTypes } from '../../../../../common/entity_analytics/risk_engine';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { getRiskInputsIndex } from '../get_risk_inputs_index';
import { riskScoreServiceFactory } from '../risk_score_service';
import { riskScoreServiceMock } from '../risk_score_service.mock';
import { riskScorePreviewRoute } from './preview';

jest.mock('../risk_score_service');
jest.mock('../get_risk_inputs_index');

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
    (getRiskInputsIndex as jest.Mock).mockImplementationOnce(
      async ({ dataViewId }: { dataViewId: string }) => ({
        index: dataViewId,
        runtimeMappings: {},
      })
    );

    clients.appClient.getAlertsIndex.mockReturnValue('default-alerts-index');
    (riskScoreServiceFactory as jest.Mock).mockReturnValue(mockRiskScoreService);

    riskScorePreviewRoute(server.router, logger);
  });

  const buildRequest = (body: object = {}) =>
    requestMock.create({
      method: 'get',
      path: RISK_SCORE_PREVIEW_URL,
      body: {
        data_view_id: 'default-dataview-id',
        ...body,
      },
    });

  describe('parameters', () => {
    describe('index / dataview', () => {
      it('requires a parameter for the dataview', async () => {
        const request = buildRequest({ data_view_id: undefined });
        const result = await server.validate(request);

        expect(result.badRequest).toHaveBeenCalledWith('data_view_id: Required');
      });

      it('respects the provided dataview', async () => {
        const request = buildRequest({ data_view_id: 'custom-dataview-id' });

        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.calculateScores).toHaveBeenCalledWith(
          expect.objectContaining({ index: 'custom-dataview-id' })
        );
      });

      it('uses an unknown dataview as index pattern', async () => {
        const request = buildRequest({ data_view_id: 'unknown-dataview' });
        (getRiskInputsIndex as jest.Mock).mockResolvedValue({
          index: 'unknown-dataview',
          runtimeMappings: {},
        });

        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.calculateScores).toHaveBeenCalledWith(
          expect.objectContaining({ index: 'unknown-dataview', runtimeMappings: {} })
        );
      });
    });

    describe('date range', () => {
      it('defaults to the last 15 days of data', async () => {
        const request = buildRequest();
        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.calculateScores).toHaveBeenCalledWith(
          expect.objectContaining({ range: { start: 'now-15d', end: 'now' } })
        );
      });

      it('respects the provided range if provided', async () => {
        const request = buildRequest({ range: { start: 'now-30d', end: 'now-20d' } });
        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.calculateScores).toHaveBeenCalledWith(
          expect.objectContaining({ range: { start: 'now-30d', end: 'now-20d' } })
        );
      });

      it('rejects an invalid date range', async () => {
        const request = buildRequest({
          range: { end: 'now' },
        });

        const result = await server.validate(request);
        expect(result.badRequest).toHaveBeenCalledWith(
          expect.stringContaining('range.start: Required')
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
        expect(mockRiskScoreService.calculateScores).toHaveBeenCalledWith(
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
              type: RiskWeightTypes.global,
              host: 0.1,
              user: 0.2,
            },
          ],
        });

        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.calculateScores).toHaveBeenCalledWith(
          expect.objectContaining({
            weights: [
              {
                type: RiskWeightTypes.global,
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
              type: RiskWeightTypes.global,
              host: 1.1,
            },
          ],
        });

        const result = await server.validate(request);
        expect(result.badRequest).toHaveBeenCalledWith(
          expect.stringContaining('weights.0.host: Number must be less than or equal to 1')
        );
      });

      it('rejects unknown weight types', async () => {
        const request = buildRequest({
          weights: [
            {
              type: 'something new',
              host: 0.1,
              user: 0.2,
            },
          ],
        });

        const result = await server.validate(request);
        expect(result.badRequest).toHaveBeenCalledWith(
          expect.stringContaining('weights.0.type: Invalid literal value')
        );
      });
    });

    describe('pagination', () => {
      it('respects the provided after_key', async () => {
        const afterKey = { 'host.name': 'hi mom' };
        const request = buildRequest({ after_keys: { host: afterKey } });

        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(mockRiskScoreService.calculateScores).toHaveBeenCalledWith(
          expect.objectContaining({ afterKeys: { host: afterKey } })
        );
      });

      it('remove invalid after_key property', async () => {
        const request = buildRequest({
          after_keys: {
            bad: 'key',
          },
        });

        const result = await server.validate(request);

        expect(result.ok).toHaveBeenCalledWith(expect.objectContaining({ after_keys: {} }));
      });
    });
  });
});
