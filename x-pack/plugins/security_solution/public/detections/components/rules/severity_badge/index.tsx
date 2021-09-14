/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upperFirst } from 'lodash/fp';
import React from 'react';
import { EuiHealth } from '@elastic/eui';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

interface Props {
  value: string;
}

const SeverityBadgeComponent: React.FC<Props> = ({ value }) => (
  <EuiHealth
    data-test-subj="severity"
    color={
      value === 'low'
        ? euiLightVars.euiColorVis0
        : value === 'medium'
        ? euiLightVars.euiColorVis5
        : value === 'high'
        ? euiLightVars.euiColorVis7
        : euiLightVars.euiColorVis9
    }
  >
    {upperFirst(value)}
  </EuiHealth>
);

export const SeverityBadge = React.memo(SeverityBadgeComponent);
