/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';

export const Display = styled.div<{ show: boolean }>`
  ${({ show }) => (show ? '' : 'display: none;')};
`;

Display.displayName = 'Display';
