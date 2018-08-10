/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Color from 'color';

export function darken(color: string, percent: number) {
  const colorObj = new Color(color);
  const darkerColor = colorObj.darken(percent);
  return darkerColor.rgb().string();
}
