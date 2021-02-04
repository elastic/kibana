/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiIcon } from '@elastic/eui';
import { Phases } from '../../../../../../common/types';
import './phase_icon.scss';
interface Props {
  enabled: boolean;
  phase: string & keyof Phases;
}
export const PhaseIcon: FunctionComponent<Props> = ({ enabled, phase }) => {
  return (
    <div
      className={`ilmPhaseIcon ilmPhaseIcon--${phase} ${enabled ? '' : 'ilmPhaseIcon--disabled'}`}
    >
      {enabled ? (
        <EuiIcon
          className={`ilmPhaseIcon__inner--${phase}`}
          type={phase === 'delete' ? 'trash' : 'checkInCircleFilled'}
          size={phase === 'delete' ? 'm' : 'l'}
        />
      ) : (
        <EuiIcon className="ilmPhaseIcon__inner--disabled" type={'dot'} size={'l'} />
      )}
    </div>
  );
};
