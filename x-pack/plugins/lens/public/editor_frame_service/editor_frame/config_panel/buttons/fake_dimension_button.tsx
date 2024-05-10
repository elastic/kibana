/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { DimensionTrigger } from '@kbn/visualization-ui-components';

export const FakeDimensionButton = ({ label }: { label: string }) => (
  <div
    css={css`
      display: flex;
      align-items: center;
      border-radius: ${euiThemeVars.euiBorderRadius};
      min-height: ${euiThemeVars.euiSizeXL};

      cursor: default !important;
      background-color: ${euiThemeVars.euiColorLightShade} !important;
      border-color: transparent !important;
      box-shadow: none !important;
      padding: 0 ${euiThemeVars.euiSizeS};
    `}
  >
    <DimensionTrigger label={label} id="lns-fakeDimension" dataTestSubj="lns-fakeDimension" />
  </div>
);
