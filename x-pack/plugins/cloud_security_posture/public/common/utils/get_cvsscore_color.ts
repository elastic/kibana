/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getCvsScoreColor = (score: number): string => {
  if (score >= 0.1 && score <= 3.9) {
    return '#54B399'; // low severity
  } else if (score >= 4.0 && score <= 6.9) {
    return '#D6BF57'; // medium severity
  } else if (score >= 7.0 && score <= 8.9) {
    return '#DA8B45'; // high severity
  } else if (score >= 9.0 && score <= 10.0) {
    return '#BD271E'; // critical severity
  } else {
    return 'Invalid score'; // if the score is not within the valid range
  }
};
