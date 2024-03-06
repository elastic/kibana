/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getStartDateFromRiskScore } from './get_start_date_from_risk_score';

describe('getStartDateFromRiskScore', () => {
  it('should return now-30d if there is an error in parsing the date', () => {
    expect(
      getStartDateFromRiskScore({
        riskRangeStart: 'aaa',
        riskScoreTimestamp: '2023-08-10T14:00:00.000Z',
      })
    ).toEqual('now-30d');
  });

  it('should return start date from risk score timestamp and risk range start with days', () => {
    expect(
      getStartDateFromRiskScore({
        riskRangeStart: 'now-30d',
        riskScoreTimestamp: '2023-08-10T14:00:00.000Z',
      })
    ).toEqual('2023-07-11T14:00:00.000Z');
  });

  it('should return start date from risk score timestamp and risk range start with hours', () => {
    expect(
      getStartDateFromRiskScore({
        riskRangeStart: 'now-8h',
        riskScoreTimestamp: '2023-08-10T14:00:00.000Z',
      })
    ).toEqual('2023-08-10T06:00:00.000Z');
  });

  it('should return start date from risk score timestamp and risk range start with minutes', () => {
    expect(
      getStartDateFromRiskScore({
        riskRangeStart: 'now-10080m',
        riskScoreTimestamp: '2023-08-10T14:00:00.000Z',
      })
    ).toEqual('2023-08-03T14:00:00.000Z');
  });

  it("should return risk range start if it's a date", () => {
    expect(
      getStartDateFromRiskScore({
        riskRangeStart: '2023-08-03T14:00:00.000Z',
        riskScoreTimestamp: '2023-08-10T14:00:00.000Z',
      })
    ).toEqual('2023-08-03T14:00:00.000Z');
  });
});
