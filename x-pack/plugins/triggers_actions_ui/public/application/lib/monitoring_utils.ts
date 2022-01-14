/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import numeral from '@elastic/numeral';

export function getFormattedSuccessRatio(successRatio: number) {
  const formatted = numeral(successRatio! * 100).format('0,0');
  return `${formatted}%`;
}
