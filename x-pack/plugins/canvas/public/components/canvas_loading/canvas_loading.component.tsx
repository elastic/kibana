/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiPanel, EuiLoadingChart, EuiSpacer, EuiText } from '@elastic/eui';

export const CanvasLoading: FC<{ msg?: string }> = ({ msg = 'Loading...' }) => (
  <div className="canvasContainer--loading">
    <EuiPanel>
      <EuiLoadingChart size="m" />
      <EuiSpacer size="s" />
      <EuiText color="default" size="s">
        <p>{msg}</p>
      </EuiText>
    </EuiPanel>
  </div>
);
