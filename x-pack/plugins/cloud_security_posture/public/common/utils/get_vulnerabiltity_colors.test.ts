/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';
import { getCvsScoreColor, getSeverityStatusColor } from './get_vulnerability_colors';

describe('getCvsScoreColor', () => {
  it('returns correct color for low severity score', () => {
    expect(getCvsScoreColor(1.5)).toBe(euiThemeVars.euiColorVis0);
  });

  it('returns correct color for medium severity score', () => {
    expect(getCvsScoreColor(5.5)).toBe(euiThemeVars.euiColorVis7);
  });

  it('returns correct color for high severity score', () => {
    expect(getCvsScoreColor(7.9)).toBe(euiThemeVars.euiColorVis9);
  });

  it('returns correct color for critical severity score', () => {
    expect(getCvsScoreColor(10.0)).toBe(euiThemeVars.euiColorDanger);
  });

  it('returns correct color for low severity score for undefined value', () => {
    expect(getCvsScoreColor(-0.2)).toBe(euiThemeVars.euiColorVis0);
  });
});

describe('getSeverityStatusColor', () => {
  it('should return the correct color for LOW severity', () => {
    expect(getSeverityStatusColor('LOW')).toBe(euiThemeVars.euiColorVis0);
  });

  it('should return the correct color for MEDIUM severity', () => {
    expect(getSeverityStatusColor('MEDIUM')).toBe(euiThemeVars.euiColorVis5_behindText);
  });

  it('should return the correct color for HIGH severity', () => {
    expect(getSeverityStatusColor('HIGH')).toBe(euiThemeVars.euiColorVis9_behindText);
  });

  it('should return the correct color for CRITICAL severity', () => {
    expect(getSeverityStatusColor('CRITICAL')).toBe(euiThemeVars.euiColorDanger);
  });

  it('should return #aaa for an unknown severity', () => {
    expect(getSeverityStatusColor('UNKNOWN')).toBe('#aaa');
  });
});
