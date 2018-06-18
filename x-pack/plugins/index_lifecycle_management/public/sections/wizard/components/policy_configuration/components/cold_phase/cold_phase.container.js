/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { connect } from 'react-redux';
import { ColdPhase as PresentationComponent } from './cold_phase';
import {
  getNodeOptions,
  getPhase,
  getPhaseData
} from '../../../../../../store/selectors';
import { setPhaseData, fetchNodes } from '../../../../../../store/actions';
import {
  PHASE_COLD,
  PHASE_WARM,
  PHASE_REPLICA_COUNT
} from '../../../../../../store/constants';

export const ColdPhase = connect(
  state => ({
    phaseData: getPhase(state, PHASE_COLD),
    nodeOptions: getNodeOptions(state),
    warmPhaseReplicaCount: getPhaseData(state, PHASE_WARM, PHASE_REPLICA_COUNT)
  }),
  {
    setPhaseData: (key, value) => setPhaseData(PHASE_COLD, key, value),
    fetchNodes
  }
)(PresentationComponent);
