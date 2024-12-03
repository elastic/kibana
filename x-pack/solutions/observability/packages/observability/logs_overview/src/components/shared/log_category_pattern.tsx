/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';
import { css } from '@emotion/react';
import React from 'react';
import { getLogCategoryTerms } from '../../utils/log_category';
import { LogCategory } from '../../types';

interface LogCategoryPatternProps {
  logCategory: LogCategory;
}

export const LogCategoryPattern: React.FC<LogCategoryPatternProps> = ({ logCategory }) => {
  const theme = useEuiTheme();
  const { euiTheme } = theme;
  const termsList = useMemo(() => getLogCategoryTerms(logCategory), [logCategory]);

  const commonStyle = css`
    display: inline-block;
    font-family: ${euiTheme.font.familyCode};
    margin-right: ${euiTheme.size.xs};
  `;

  const termStyle = css`
    ${commonStyle};
  `;

  const separatorStyle = css`
    ${commonStyle};
    color: ${euiTheme.colors.successText};
  `;

  return (
    <pre>
      <div css={separatorStyle}>*</div>
      {termsList.map((term, index) => (
        <React.Fragment key={index}>
          <div css={termStyle}>{term}</div>
          <div css={separatorStyle}>*</div>
        </React.Fragment>
      ))}
    </pre>
  );
};
