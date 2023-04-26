/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';

export const getCvsScoreColor = (score: number): string | undefined => {
  if (score >= 0.1 && score <= 3.9) {
    return euiThemeVars.euiColorVis0; // low severity
  } else if (score >= 4.0 && score <= 6.9) {
    return euiThemeVars.euiColorVis7; // medium severity
  } else if (score >= 7.0 && score <= 8.9) {
    return euiThemeVars.euiColorVis9; // high severity
  } else if (score >= 9.0 && score <= 10.0) {
    return euiThemeVars.euiColorDanger; // critical severity
  } else {
    return undefined; // if the score is not within the valid range
  }
};
