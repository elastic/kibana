/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

const StyledDiv = styled.div<{ addPadding: boolean }>`
  padding-left: ${({ addPadding }) => addPadding && '53px'}; /* to align with the step title */
`;

StyledDiv.defaultProps = {
  addPadding: false,
};

export const StepContentWrapper = React.memo(StyledDiv);

StepContentWrapper.displayName = 'StepContentWrapper';
