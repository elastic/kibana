/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { getPhase } from '../../../../store/selectors';
import { setPhaseData } from '../../../../store/actions';
import { PHASE_COLD, PHASE_HOT, PHASE_ROLLOVER_ENABLED } from '../../../../constants';
import { ColdPhase as PresentationComponent } from './cold_phase';

export const ColdPhase = connect(
  (state) => ({
    phaseData: getPhase(state, PHASE_COLD),
    hotPhaseRolloverEnabled: getPhase(state, PHASE_HOT)[PHASE_ROLLOVER_ENABLED],
  }),
  {
    setPhaseData: (key, value) => setPhaseData(PHASE_COLD, key, value),
  }
)(PresentationComponent);
