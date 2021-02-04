/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiIcon } from '@elastic/eui';

import './active_highlight.scss';

interface Props {
  phase: 'hot' | 'warm' | 'cold';
  enabled: boolean;
}
export const ActiveHighlight: FunctionComponent<Props> = ({ phase, enabled }) => {
  return (
    <div className={`ilmActivePhaseHighlight ${phase}Phase ${enabled ? 'active' : ''}`}>
      <div className={`ilmActivePhaseHighlight__line`} />
      <div className={'ilmActivePhaseHighlight__check'}>
        <EuiIcon type="check" size={'s'} className={'ilmActivePhaseHighlight__icon'} />
      </div>
    </div>
  );
};
