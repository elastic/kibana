/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

/* <div> cannot appear as a descendant of <p>, EuiSpacer is a div */
const SpacerComponent = ({
  size = 'l',
}: {
  size?: 'xxs' | 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl' | 'xxxxl';
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      css={css`
        padding: ${euiTheme.size[size]} 0 0 0;
        width: 100%;
        height: 1px;
        display: inline-block;
        &::before {
          content: ' ';
        }
      `}
    />
  );
};

export const Spacer = React.memo(SpacerComponent);
