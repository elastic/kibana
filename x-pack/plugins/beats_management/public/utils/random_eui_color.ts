/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { sample } from 'lodash';

export const randomEUIColor = (euiVars: any) => {
  const rgb = sample(
    Object.keys(euiVars)
      .filter((key) => key.startsWith('euiColorVis'))
      .map((key) => (euiVars as any)[key])
  );

  const matchedrgb = rgb.match(
    /^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i
  );
  return matchedrgb && matchedrgb.length === 4
    ? '#' +
        ('0' + parseInt(matchedrgb[1], 10).toString(16)).slice(-2) +
        ('0' + parseInt(matchedrgb[2], 10).toString(16)).slice(-2) +
        ('0' + parseInt(matchedrgb[3], 10).toString(16)).slice(-2)
    : '';
};
