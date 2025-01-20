/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';

export function getVizColorForIndex(index = 0, euiTheme: EuiThemeComputed) {
  return euiTheme.colors.vis[`euiColorVis${index % 10}`];
}
