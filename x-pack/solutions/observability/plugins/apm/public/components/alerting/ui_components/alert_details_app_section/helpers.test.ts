/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils/anomaly_threshold';
import { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';
import {
  formatAnomalyCalloutBody,
  formatAnomalyCalloutTitle,
  getAlertDetailsRangeStart,
  getAnomalyCalloutColor,
} from './helpers';

describe('alert details anomaly helpers', () => {
  describe('getAlertDetailsRangeStart', () => {
    const alertStart = '2026-07-16T10:00:00.000Z';

    it('returns alertStart for non-anomaly alerts', () => {
      expect(
        getAlertDetailsRangeStart({
          alertStart,
          isAnomaly: false,
          anomalyTimestamp: new Date('2026-07-16T09:00:00.000Z').getTime(),
        })
      ).toBe(alertStart);
    });

    it('returns alertStart when anomalyTimestamp is undefined', () => {
      expect(
        getAlertDetailsRangeStart({
          alertStart,
          isAnomaly: true,
        })
      ).toBe(alertStart);
    });

    it('uses the anomaly timestamp when isAnomaly and anomalyTimestamp are set', () => {
      expect(
        getAlertDetailsRangeStart({
          alertStart,
          isAnomaly: true,
          anomalyTimestamp: new Date('2026-07-16T09:30:00.000Z').getTime(),
        })
      ).toBe('2026-07-16T09:30:00.000Z');
    });
  });

  describe('getAnomalyCalloutColor', () => {
    it('maps critical severity to danger', () => {
      expect(getAnomalyCalloutColor(ML_ANOMALY_SEVERITY.CRITICAL)).toBe('danger');
    });

    it('maps major and minor severity to warning', () => {
      expect(getAnomalyCalloutColor(ML_ANOMALY_SEVERITY.MAJOR)).toBe('warning');
      expect(getAnomalyCalloutColor(ML_ANOMALY_SEVERITY.MINOR)).toBe('warning');
    });

    it('maps warning and low severity to primary', () => {
      expect(getAnomalyCalloutColor(ML_ANOMALY_SEVERITY.WARNING)).toBe('primary');
      expect(getAnomalyCalloutColor(ML_ANOMALY_SEVERITY.LOW)).toBe('primary');
    });
  });

  describe('formatAnomalyCalloutTitle', () => {
    it('includes severity and detector metric in the title', () => {
      expect(
        formatAnomalyCalloutTitle({
          alertSeverity: ML_ANOMALY_SEVERITY.CRITICAL,
          detectorType: AnomalyDetectorType.txFailureRate,
        })
      ).toBe('Critical APM anomaly detected - Failed transaction rate');
    });
  });

  describe('formatAnomalyCalloutBody', () => {
    it('describes the rule severity threshold', () => {
      expect(formatAnomalyCalloutBody(ML_ANOMALY_THRESHOLD.WARNING)).toBe(
        'Alert when an anomaly with severity warning or above is detected.'
      );
    });
  });
});
