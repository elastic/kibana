/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';

import { getHumanizedDuration } from '../helpers';

const P = styled.p`
  margin-bottom: 5px;
`;

P.displayName = 'P';

export const FormattedDurationTooltipContent = React.memo<{
  maybeDurationNanoseconds: string | number | object | undefined | null;
  tooltipTitle?: string;
}>(({ maybeDurationNanoseconds, tooltipTitle }) => (
  <>
    {tooltipTitle != null ? <P data-test-subj="title">{tooltipTitle}</P> : null}
    <P data-test-subj="humanized">{getHumanizedDuration(maybeDurationNanoseconds)}</P>
    <P data-test-subj="raw-value">
      <FormattedMessage id="xpack.siem.formattedDuration.tooltipLabel" defaultMessage="raw" />
      {': '}
      {maybeDurationNanoseconds}
    </P>
  </>
));

FormattedDurationTooltipContent.displayName = 'FormattedDurationTooltipContent';

export const FormattedDurationTooltip = React.memo<{
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

FormattedDurationTooltip.displayName = 'FormattedDurationTooltip';
