/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { EuiTheme } from '../../../observability/public';

export function useTheme(): EuiTheme {
  const theme = useContext(ThemeContext);
  return theme;
}
