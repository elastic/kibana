/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { getHumanizedDuration } from '../helpers';

const P = styled.p`
  margin-bottom: 5px;
`;

export const FormattedDurationTooltipContent = pure<{
  maybeDurationNanoseconds: string | number | object | undefined | null;
  tooltipTitle?: string;
}>(({ maybeDurationNanoseconds, tooltipTitle }) => (
  <>
    {tooltipTitle != null ? <P data-test-subj="title">{tooltipTitle}</P> : null}
    <P data-test-subj="humanized">{getHumanizedDuration(maybeDurationNanoseconds)}</P>
    <P data-test-subj="raw-value">raw: {maybeDurationNanoseconds}</P>
  </>
));

export const FormattedDurationTooltip = pure<{
  children: JSX.Element;
  maybeDurationNanoseconds: string | number | object | undefined | null;
  tooltipTitle?: string;
}>(({ children, maybeDurationNanoseconds, tooltipTitle }) => (
  <EuiToolTip
    data-test-subj="formatted-duration-tooltip"
    content={
      <FormattedDurationTooltipContent
        maybeDurationNanoseconds={maybeDurationNanoseconds}
        tooltipTitle={tooltipTitle}
      />
    }
  >
    <>{children}</>
  </EuiToolTip>
));
