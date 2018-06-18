/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { connect } from 'react-redux';
import { HotPhase as PresentationComponent } from './hot_phase';
import { getPhase } from '../../../../../../store/selectors';
import { setPhaseData } from '../../../../../../store/actions';
import { PHASE_HOT } from '../../../../../../store/constants';

export const HotPhase = connect(
  state => ({
    phaseData: getPhase(state, PHASE_HOT)
  }),
  {
    setPhaseData: (key, value) => setPhaseData(PHASE_HOT, key, value)
  },
)(PresentationComponent);
