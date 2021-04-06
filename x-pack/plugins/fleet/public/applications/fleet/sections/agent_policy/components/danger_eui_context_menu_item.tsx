/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { EuiContextMenuItem } from '@elastic/eui';

export const DangerEuiContextMenuItem = styled(EuiContextMenuItem)`
  color: ${(props) => props.theme.eui.euiTextColors.danger};
`;
