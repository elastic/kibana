/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars } from '@kbn/ui-theme';
import { CaseSeverity } from '../../../common/types/domain';
import { CRITICAL, HIGH, LOW, MEDIUM } from './translations';

export const severities = {
  [CaseSeverity.LOW]: {
    color: euiLightVars.euiColorVis0,
    label: LOW,
  },
  [CaseSeverity.MEDIUM]: {
    color: euiLightVars.euiColorVis5,
    label: MEDIUM,
  },
  [CaseSeverity.HIGH]: {
    color: euiLightVars.euiColorVis7,
    label: HIGH,
  },
  [CaseSeverity.CRITICAL]: {
    color: euiLightVars.euiColorVis9,
    label: CRITICAL,
  },
};
