/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import styled from 'styled-components';

export const CalloutItem = styled.div`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

export const CopyToClipboardButton = styled(EuiButtonEmpty)`
  margin-left: ${({ theme }) => theme.eui.euiSizeXS};
`;
