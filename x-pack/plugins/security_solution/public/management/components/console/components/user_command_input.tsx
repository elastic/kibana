/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCode } from '@elastic/eui';
import styled from 'styled-components';

const StyledEuiCode = styled(EuiCode)`
  padding-left: 0;
`;

export interface UserCommandInputProps {
  input: string;
}

export const UserCommandInput = memo<UserCommandInputProps>(({ input }) => {
  return (
    <StyledEuiCode language="shell" transparentBackground={true}>
      {input}
    </StyledEuiCode>
  );
});
UserCommandInput.displayName = 'UserCommandInput';
