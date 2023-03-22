/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';
import { getCvsScoreColor } from './get_cvsscore_color';

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

  it('returns error message for invalid score', () => {
    expect(getCvsScoreColor(-1)).toBe(undefined);
  });

  it('returns error message for invalid score when score is 0.0', () => {
    expect(getCvsScoreColor(0.0)).toBe(undefined);
  });
});
