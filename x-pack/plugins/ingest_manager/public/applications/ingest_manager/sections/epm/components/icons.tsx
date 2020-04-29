/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiIcon } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

export const StyledAlert = styled(EuiIcon)`
  color: ${props => props.theme.eui.euiColorWarning};
  padding: 0 5px;
`;

export const UpdateIcon = () => <StyledAlert type="alert" size="l" />;
