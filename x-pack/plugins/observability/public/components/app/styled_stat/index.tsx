/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import styled from 'styled-components';
import { EuiStat } from '@elastic/eui';

/**
 * This component is needed until EuiStat supports custom colors
 */
export const StyledStat = styled(EuiStat)`
  .euiStat__title {
    color: ${(props) => props.color};
  }
`;
