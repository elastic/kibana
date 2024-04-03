/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { riskScoreCalculationRoute } from './calculation';

import { loggerMock } from '@kbn/logging-mocks';
import { RISK_SCORE_CALCULATION_URL } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { riskScoreServiceFactory } from '../risk_score_service';
import { riskScoreServiceMock } from '../risk_score_service.mock';
import { getRiskInputsIndex } from '../get_risk_inputs_index';
import { calculateAndPersistRiskScoresMock } from '../calculate_and_persist_risk_scores.mock';

jest.mock('../get_risk_inputs_index');
jest.mock('../risk_score_service');

describe('risk score calculation route', () => {
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

    (getRiskInputsIndex as jest.Mock).mockResolvedValue({
      index: 'default-dataview-index',
      runtimeMappings: {},
    });
    clients.appClient.getAlertsIndex.mockReturnValue('default-alerts-index');
    (riskScoreServiceFactory as jest.Mock).mockReturnValue(mockRiskScoreService);

    riskScoreCalculationRoute(server.router, logger);
  });

  const buildRequest = (overrides: object = {}) => {
    const defaults = {
      data_view_id: 'default-dataview-id',
      range: { start: 'now-30d', end: 'now' },
      identifier_type: 'host',
    };

    return requestMock.create({
      method: 'post',
      path: RISK_SCORE_CALCULATION_URL,
      body: { ...defaults, ...overrides },
    });
  };

  it('should return 200 when risk score calculation is successful', async () => {
    mockRiskScoreService.calculateAndPersistScores.mockResolvedValue(
      calculateAndPersistRiskScoresMock.buildResponse()
    );
    const request = buildRequest();

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
  });

  describe('parameters', () => {
    it('accepts a parameter for the dataview', async () => {
      const request = buildRequest({ data_view_id: 'custom-dataview-id' });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(getRiskInputsIndex).toHaveBeenCalledWith(
        expect.objectContaining({ dataViewId: 'custom-dataview-id' })
      );
    });

    it('accepts a parameter for the range', async () => {
      const request = buildRequest({ range: { start: 'now-30d', end: 'now-20d' } });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledWith(
        expect.objectContaining({ range: { start: 'now-30d', end: 'now-20d' } })
      );
    });
  });

  describe('validation', () => {
    describe('required parameters', () => {
      it('requires a parameter for the dataview', async () => {
        const request = buildRequest({ data_view_id: undefined });
        const result = await server.validate(request);

        expect(result.badRequest).toHaveBeenCalledWith(
          'Invalid value "undefined" supplied to "data_view_id"'
        );
      });

      it('requires a parameter for the date range', async () => {
        const request = buildRequest({ range: undefined });
        const result = await server.validate(request);

        expect(result.badRequest).toHaveBeenCalledWith(
          'Invalid value "undefined" supplied to "range"'
        );
      });

      it('requires a parameter for the identifier type', async () => {
        const request = buildRequest({ identifier_type: undefined });
        const result = await server.validate(request);

        expect(result.badRequest).toHaveBeenCalledWith(
          'Invalid value "undefined" supplied to "identifier_type"'
        );
      });
    });

    it('uses an unknown dataview as index pattern', async () => {
      const request = buildRequest({ data_view_id: 'unknown-dataview' });
      (getRiskInputsIndex as jest.Mock).mockResolvedValue({
        index: 'unknown-dataview',
        runtimeMappings: {},
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'unknown-dataview', runtimeMappings: {} })
      );
    });

    it('rejects an invalid date range', async () => {
      const request = buildRequest({ range: 'bad range' });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'Invalid value "bad range" supplied to "range"'
      );
    });
  });
});
