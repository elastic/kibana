/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import './active_highlight.scss';

interface Props {
  phase: 'hot' | 'warm' | 'cold';
  enabled: boolean;
}
export const ActiveHighlight: FunctionComponent<Props> = ({ phase, enabled }) => {
  return <div className={`ilmActivePhaseHighlight ${phase}Phase ${enabled ? 'active' : ''} `} />;
};
