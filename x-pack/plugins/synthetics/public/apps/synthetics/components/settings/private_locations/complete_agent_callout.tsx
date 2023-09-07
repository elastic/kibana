/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { getAgentPolicyIsCompleteAction, selectHasCompleteAgent } from '../../../state';

export const CompleteAgentCallout = ({
  selectedPolicyId,
  agentsCount,
}: {
  selectedPolicyId?: string;
  agentsCount: number;
}) => {
  const { agentType, isCompleteLoading } = useSelector(selectHasCompleteAgent);

  const dispatch = useDispatch();

  useEffect(() => {
    if (selectedPolicyId) {
      dispatch(getAgentPolicyIsCompleteAction.get(selectedPolicyId));
    }
  }, [dispatch, selectedPolicyId]);

  if (
    isCompleteLoading ||
    !selectedPolicyId ||
    agentsCount === 0 ||
    !agentType ||
    agentType === 'unknown'
  ) {
    return null;
  }
  if (agentType === 'lightweight') {
    return (
      <EuiCallOut title={NO_BROWSER_RUNS} color="warning" iconType="help">
        <p>{BROWSER_RUNS_CANT_RUN}</p>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut title={BROWSER_RUNS} color="success" iconType="checkInCircleFilled">
      <p>{BROWSER_RUNS_CAN_RUN}</p>
    </EuiCallOut>
  );
};

const BROWSER_RUNS = i18n.translate('xpack.synthetics.monitorManagement.browserRuns', {
  defaultMessage: 'Browser checks',
});

const NO_BROWSER_RUNS = i18n.translate('xpack.synthetics.monitorManagement.browserRuns.no', {
  defaultMessage: 'No browser checks',
});

const BROWSER_RUNS_CAN_RUN = i18n.translate('xpack.synthetics.monitorManagement.browserRuns.can', {
  defaultMessage:
    'Since you have the complete agent installed in selected policy, you can run browser checks on this location.',
});

const BROWSER_RUNS_CANT_RUN = i18n.translate(
  'xpack.synthetics.monitorManagement.browserRuns.cannot',
  {
    defaultMessage:
      'Since you have not installed the complete agent in selected policy, you cannot run browser checks on this location.',
  }
);
