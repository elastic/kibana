/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { memo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../../lib/kibana';

export const LandingPageComponent = memo(({ withPadding = true }: { withPadding?: boolean }) => {
  const { getStartedComponent$ } = useKibana().services;
  const GetStartedComponent = useObservable(getStartedComponent$);
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        padding: ${withPadding ? euiTheme.size.l : 'none'};
      `}
    >
      {GetStartedComponent}
    </div>
  );
});

LandingPageComponent.displayName = 'LandingPageComponent';
