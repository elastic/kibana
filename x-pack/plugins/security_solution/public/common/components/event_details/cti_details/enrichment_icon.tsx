/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';

import { getTooltipTitle, getTooltipContent } from './helpers';

export const EnrichmentIcon: React.FC<{ type: string | undefined }> = ({ type }) => {
  return (
    <EuiToolTip title={getTooltipTitle(type)} content={getTooltipContent(type)}>
      <EuiIcon type="logoSecurity" size="s" />
    </EuiToolTip>
  );
};
