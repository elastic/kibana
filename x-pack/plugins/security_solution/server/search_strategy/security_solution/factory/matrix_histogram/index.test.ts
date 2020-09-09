/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';

import { MatrixHistogramRequestOptions } from '../../../../../../common/search_strategy/security_solution';
import * as buildQuery from './alerts/query.alerts_histogram.dsl';
import { matrixHistogram } from '.';
import {
  formattedAlertsSearchStrategyResponse,
  formattedAnomaliesSearchStrategyResponse,
  formattedAuthenticationsSearchStrategyResponse,
  formattedEventsSearchStrategyResponse,
  formattedDnsSearchStrategyResponse,
  mockAlertsOptions,
  mockAlertsSearchStrategyResponse,
  mockAnomaliesOptions,
  mockAnomaliesSearchStrategyResponse,
  mockAuthenticationsOptions,
  mockAuthenticationsSearchStrategyResponse,
  mockEventsOptions,
  mockEventsSearchStrategyResponse,
  mockDnsOptions,
  mockDnsSearchStrategyResponse,
} from './__mocks__';
import { alertsMatrixHistogramConfig } from './alerts';
import { anomaliesMatrixHistogramConfig } from './anomalies';
import { authenticationsMatrixHistogramConfig } from './authentications';
import { eventsMatrixHistogramConfig } from './events';
import { dnsMatrixHistogramConfig } from './dns';

describe('Alerts matrixHistogram search strategy', () => {
  const buildMatrixHistogramQuery = jest.spyOn(alertsMatrixHistogramConfig, 'buildDsl');

  afterEach(() => {
    buildMatrixHistogramQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      matrixHistogram.buildDsl(mockAlertsOptions);
      expect(buildMatrixHistogramQuery).toHaveBeenCalledWith(mockAlertsOptions);
    });

    test('should throw error if histogramType is invalid', () => {
      const overSizeOptions = {
        ...mockAlertsOptions,
        histogramType: 'xxx',
      } as MatrixHistogramRequestOptions;

      expect(() => {
        matrixHistogram.buildDsl(overSizeOptions);
      }).toThrowError(`This histogram type xxx is unknown to the server side`);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await matrixHistogram.parse(
        mockAlertsOptions,
        mockAlertsSearchStrategyResponse
      );
      expect(result).toMatchObject(formattedAlertsSearchStrategyResponse);
    });
  });
});

describe('Anomalies matrixHistogram search strategy', () => {
  const buildMatrixHistogramQuery = jest.spyOn(anomaliesMatrixHistogramConfig, 'buildDsl');

  afterEach(() => {
    buildMatrixHistogramQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      matrixHistogram.buildDsl(mockAnomaliesOptions);
      expect(buildMatrixHistogramQuery).toHaveBeenCalledWith(mockAnomaliesOptions);
    });

    test('should throw error if histogramType is invalid', () => {
      const overSizeOptions = {
        ...mockAnomaliesOptions,
        histogramType: 'xxx',
      } as MatrixHistogramRequestOptions;

      expect(() => {
        matrixHistogram.buildDsl(overSizeOptions);
      }).toThrowError(`This histogram type xxx is unknown to the server side`);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await matrixHistogram.parse(
        mockAnomaliesOptions,
        mockAnomaliesSearchStrategyResponse
      );
      expect(result).toMatchObject(formattedAnomaliesSearchStrategyResponse);
    });
  });
});

describe('Authentications matrixHistogram search strategy', () => {
  const buildMatrixHistogramQuery = jest.spyOn(authenticationsMatrixHistogramConfig, 'buildDsl');

  afterEach(() => {
    buildMatrixHistogramQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      matrixHistogram.buildDsl(mockAuthenticationsOptions);
      expect(buildMatrixHistogramQuery).toHaveBeenCalledWith(mockAuthenticationsOptions);
    });

    test('should throw error if histogramType is invalid', () => {
      const overSizeOptions = {
        ...mockAuthenticationsOptions,
        histogramType: 'xxx',
      } as MatrixHistogramRequestOptions;

      expect(() => {
        matrixHistogram.buildDsl(overSizeOptions);
      }).toThrowError(`This histogram type xxx is unknown to the server side`);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await matrixHistogram.parse(
        mockAuthenticationsOptions,
        mockAuthenticationsSearchStrategyResponse
      );
      expect(result).toMatchObject(formattedAuthenticationsSearchStrategyResponse);
    });
  });
});

describe('Events matrixHistogram search strategy', () => {
  const buildMatrixHistogramQuery = jest.spyOn(eventsMatrixHistogramConfig, 'buildDsl');

  afterEach(() => {
    buildMatrixHistogramQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      matrixHistogram.buildDsl(mockEventsOptions);
      expect(buildMatrixHistogramQuery).toHaveBeenCalledWith(mockEventsOptions);
    });

    test('should throw error if histogramType is invalid', () => {
      const overSizeOptions = {
        ...mockEventsOptions,
        histogramType: 'xxx',
      } as MatrixHistogramRequestOptions;

      expect(() => {
        matrixHistogram.buildDsl(overSizeOptions);
      }).toThrowError(`This histogram type xxx is unknown to the server side`);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await matrixHistogram.parse(
        mockEventsOptions,
        mockEventsSearchStrategyResponse
      );
      expect(result).toMatchObject(formattedEventsSearchStrategyResponse);
    });
  });
});

describe('Dns matrixHistogram search strategy', () => {
  const buildMatrixHistogramQuery = jest.spyOn(dnsMatrixHistogramConfig, 'buildDsl');

  afterEach(() => {
    buildMatrixHistogramQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      matrixHistogram.buildDsl(mockDnsOptions);
      expect(buildMatrixHistogramQuery).toHaveBeenCalledWith(mockDnsOptions);
    });

    test('should throw error if histogramType is invalid', () => {
      const overSizeOptions = {
        ...mockDnsOptions,
        histogramType: 'xxx',
      } as MatrixHistogramRequestOptions;

      expect(() => {
        matrixHistogram.buildDsl(overSizeOptions);
      }).toThrowError(`This histogram type xxx is unknown to the server side`);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await matrixHistogram.parse(mockDnsOptions, mockDnsSearchStrategyResponse);
      expect(result).toMatchObject(formattedDnsSearchStrategyResponse);
    });
  });
});
