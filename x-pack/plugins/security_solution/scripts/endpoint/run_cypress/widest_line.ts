/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringWidth from 'string-width';

export default function widestLine(string) {
  let lineWidth = 0;

  for (const line of string.split('\n')) {
    lineWidth = Math.max(lineWidth, stringWidth(line));
  }

  return lineWidth;
}
