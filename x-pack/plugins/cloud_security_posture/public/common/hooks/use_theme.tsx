/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useTheme as useEmotionTheme } from '@emotion/react';
import { EuiTheme } from '../../../../../../src/plugins/kibana_react/common';

export function useTheme() {
  // TODO: augment @emotion/react#Theme to EuiTheme
  const theme = useEmotionTheme();
  return theme as EuiTheme;
}
