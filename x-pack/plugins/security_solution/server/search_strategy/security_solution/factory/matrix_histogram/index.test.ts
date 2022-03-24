/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MatrixHistogramRequestOptions,
  MatrixHistogramType,
} from '../../../../../common/search_strategy/security_solution';
import { matrixHistogram } from '.';
import {
  formattedAlertsSearchStrategyResponse,
  formattedAnomaliesSearchStrategyResponse,
  formattedAuthenticationsSearchStrategyResponse,
  formattedEventsSearchStrategyResponse,
  formattedDnsSearchStrategyResponse,
  mockAlertsSearchStrategyResponse,
  mockAnomaliesSearchStrategyResponse,
  mockAuthenticationsSearchStrategyResponse,
  mockEventsSearchStrategyResponse,
  mockDnsSearchStrategyResponse,
  formattedPreviewStrategyResponse,
} from './__mocks__';
import { alertsMatrixHistogramConfig } from './alerts';
import { anomaliesMatrixHistogramConfig } from './anomalies';
import { authenticationsMatrixHistogramConfig } from './authentications';
import { eventsMatrixHistogramConfig } from './events';
import { dnsMatrixHistogramConfig } from './dns';
import { previewMatrixHistogramConfig } from './preview';

import { mockOptions as mockAlertsOptions } from './alerts/__mocks__';
import { mockOptions as mockAnomaliesOptions } from './anomalies/__mocks__';
import { mockOptions as mockAuthenticationsOptions } from './authentications/__mocks__';
import { mockOptions as mockEventsOptions } from './events/__mocks__';
import { mockOptions as mockDnsOptions } from './dns/__mocks__';
import { mockOptions as mockPreviewOptions } from './preview/__mocks__';

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
      const invalidOptions: MatrixHistogramRequestOptions = {
        ...mockAlertsOptions,
        histogramType: 'xxx' as MatrixHistogramType,
      } as MatrixHistogramRequestOptions;

      expect(() => {
        matrixHistogram.buildDsl(invalidOptions);
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
      const invalidOptions: MatrixHistogramRequestOptions = {
        ...mockAnomaliesOptions,
        histogramType: 'xxx' as MatrixHistogramType,
      } as MatrixHistogramRequestOptions;

      expect(() => {
        matrixHistogram.buildDsl(invalidOptions);
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
      const invalidOptions = {
        ...mockAuthenticationsOptions,
        histogramType: 'xxx' as MatrixHistogramType,
      } as MatrixHistogramRequestOptions;

      expect(() => {
        matrixHistogram.buildDsl(invalidOptions);
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
      const invalidOptions = {
        ...mockEventsOptions,
        histogramType: 'xxx' as MatrixHistogramType,
      } as MatrixHistogramRequestOptions;

      expect(() => {
        matrixHistogram.buildDsl(invalidOptions);
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
      const invalidOptions = {
        ...mockDnsOptions,
        histogramType: 'xxx' as MatrixHistogramType,
      } as MatrixHistogramRequestOptions;

      expect(() => {
        matrixHistogram.buildDsl(invalidOptions);
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

describe('Preview matrixHistogram search strategy', () => {
  const buildMatrixHistogramQuery = jest.spyOn(previewMatrixHistogramConfig, 'buildDsl');

  afterEach(() => {
    buildMatrixHistogramQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      matrixHistogram.buildDsl(mockPreviewOptions);
      expect(buildMatrixHistogramQuery).toHaveBeenCalledWith(mockPreviewOptions);
    });

    test('should throw error if histogramType is invalid', () => {
      const invalidOptions: MatrixHistogramRequestOptions = {
        ...mockPreviewOptions,
        histogramType: 'xxx' as MatrixHistogramType,
      } as MatrixHistogramRequestOptions;

      expect(() => {
        matrixHistogram.buildDsl(invalidOptions);
      }).toThrowError(`This histogram type xxx is unknown to the server side`);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await matrixHistogram.parse(
        mockPreviewOptions,
        mockAlertsSearchStrategyResponse
      );
      expect(result).toMatchObject(formattedPreviewStrategyResponse);
    });
  });
});
