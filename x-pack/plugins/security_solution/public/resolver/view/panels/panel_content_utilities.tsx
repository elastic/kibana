/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';

/**
 * A bold version of EuiCode to display certain titles with
 */
export const BoldCode = styled(EuiCode)`
  &.euiCodeBlock code.euiCodeBlock__code {
    font-weight: 900;
  }
`;

/**
 * A component to keep time representations in blocks so they don't wrap
 * and look bad.
 */
export const StyledTime = styled('time')`
  display: inline-block;
  text-align: start;
`;
