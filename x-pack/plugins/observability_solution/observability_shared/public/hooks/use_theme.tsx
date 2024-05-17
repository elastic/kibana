/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { useContext } from 'react';
import { ThemeContext } from 'styled-components';

export function useTheme() {
  const theme: EuiTheme = useContext(ThemeContext);
  return theme;
}
