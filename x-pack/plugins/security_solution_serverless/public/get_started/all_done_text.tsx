/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { ALL_DONE_TEXT } from './translations';

const AllDoneTextComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <p>
      <span
        className="eui-alignMiddle"
        css={css`
          font-size: ${euiTheme.base * 0.875}px;
          color: #69707d;
        `}
      >
        {ALL_DONE_TEXT}
      </span>
      <EuiIcon
        className="eui-alignMiddle"
        css={css`
          padding-left: ${euiTheme.size.xs};
        `}
        type="checkInCircleFilled"
        color="#00BFB3"
        size="l"
      />
    </p>
  );
};

export const AllDoneText = React.memo(AllDoneTextComponent);
