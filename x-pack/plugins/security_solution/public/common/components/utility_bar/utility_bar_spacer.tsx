/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { BarSpacer } from './styles';

export interface UtilityBarSpacerProps {
  dataTestSubj?: string;
}

export const UtilityBarSpacer = React.memo<UtilityBarSpacerProps>(({ dataTestSubj }) => (
  <BarSpacer data-test-subj={dataTestSubj} />
));

UtilityBarSpacer.displayName = 'UtilityBarSpacer';
