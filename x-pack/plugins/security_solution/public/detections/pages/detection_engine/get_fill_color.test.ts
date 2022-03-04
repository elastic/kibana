/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RISK_COLOR_LOW,
  RISK_COLOR_MEDIUM,
  RISK_COLOR_HIGH,
  RISK_COLOR_CRITICAL,
  RISK_SCORE_MEDIUM,
  RISK_SCORE_HIGH,
  RISK_SCORE_CRITICAL,
} from '../../components/rules/step_about_rule/data';
import { getFillColor } from './get_fill_color';

describe('getFillColor', () => {
  describe('when useWarmPalette is true', () => {
    const useWarmPalette = true;

    it('returns the expected fill color', () => {
      expect(getFillColor({ riskScore: 50, useWarmPalette })).toEqual('#efb685');
    });

    it('returns the expected fill color when risk score is zero', () => {
      expect(getFillColor({ riskScore: 0, useWarmPalette })).toEqual('#fbfada');
    });

    it('returns the expected fill color when risk score is less than zero', () => {
      expect(getFillColor({ riskScore: -1, useWarmPalette })).toEqual('#fbfada');
    });

    it('returns the expected fill color when risk score is 100', () => {
      expect(getFillColor({ riskScore: 100, useWarmPalette })).toEqual('#e7664c');
    });

    it('returns the expected fill color when risk score is greater than 100', () => {
      expect(getFillColor({ riskScore: 101, useWarmPalette })).toEqual('#e7664c');
    });
  });

  describe('when useWarmPalette is false', () => {
    const useWarmPalette = false;

    it('returns the expected fill color', () => {
      expect(getFillColor({ riskScore: 50, useWarmPalette })).toEqual('#d6bf57');
    });

    it('returns the expected fill color when risk score is zero', () => {
      expect(getFillColor({ riskScore: 0, useWarmPalette })).toEqual('#54b399');
    });

    it('returns the expected fill color when risk score is less than zero', () => {
      expect(getFillColor({ riskScore: -1, useWarmPalette })).toEqual('#54b399');
    });

    it('returns the expected fill color when risk score is 100', () => {
      expect(getFillColor({ riskScore: 100, useWarmPalette })).toEqual('#e7664c');
    });

    it('returns the expected fill color when risk score is greater than 100', () => {
      expect(getFillColor({ riskScore: 101, useWarmPalette })).toEqual('#e7664c');
    });

    it('returns the expected fill color when risk score is greater than RISK_SCORE_CRITICAL', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_CRITICAL + 1, useWarmPalette })).toEqual(
        RISK_COLOR_CRITICAL
      );
    });

    it('returns the expected fill color when risk score is equal to RISK_SCORE_CRITICAL', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_CRITICAL, useWarmPalette })).toEqual(
        RISK_COLOR_CRITICAL
      );
    });

    it('returns the expected fill color when risk score is greater than RISK_SCORE_HIGH', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_HIGH + 1, useWarmPalette })).toEqual(
        RISK_COLOR_HIGH
      );
    });

    it('returns the expected fill color when risk score is equal to RISK_SCORE_HIGH', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_HIGH, useWarmPalette })).toEqual(RISK_COLOR_HIGH);
    });

    it('returns the expected fill color when risk score is greater than RISK_SCORE_MEDIUM', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_MEDIUM + 1, useWarmPalette })).toEqual(
        RISK_COLOR_MEDIUM
      );
    });

    it('returns the expected fill color when risk score is equal to RISK_SCORE_MEDIUM', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_MEDIUM, useWarmPalette })).toEqual(
        RISK_COLOR_MEDIUM
      );
    });

    it('returns the expected fill color when risk score is less than RISK_SCORE_MEDIUM', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_MEDIUM - 1, useWarmPalette })).toEqual(
        RISK_COLOR_LOW
      );
    });
  });
});
