/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  title?: string;
}

export const PageWrapper: React.FC<Props> = ({
  children,
  title = <FormattedMessage id="xpack.csp.findings.findingsTitle" defaultMessage="Findings" />,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        padding: ${euiTheme.size.l};
      `}
    >
      <EuiTitle size="l">
        <h2>{title}</h2>
      </EuiTitle>
      <EuiSpacer />
      {children}
    </div>
  );
};
