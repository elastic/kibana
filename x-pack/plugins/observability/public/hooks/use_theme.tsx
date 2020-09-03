/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { EuiTheme } from '../../../../legacy/common/eui_styled_components';

export function useTheme() {
  const theme: EuiTheme = useContext(ThemeContext);
  return theme;
}
