/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import { gutterTimeline } from '../../../common/lib/helpers';

export const WhitePageWrapper = styled.div`
  background-color: ${({ theme }) => theme.eui.euiColorEmptyShade};
  border-top: ${({ theme }) => theme.eui.euiBorderThin};
  flex: 1 1 auto;
`;

export const SectionWrapper = styled.div`
  box-sizing: content-box;
  margin: 0 auto;
  max-width: 1175px;
  width: 100%;
`;

export const HeaderWrapper = styled.div`
  padding: ${({ theme }) => `${theme.eui.paddingSizes.l} ${gutterTimeline} 0
  ${theme.eui.paddingSizes.l}`};
`;
