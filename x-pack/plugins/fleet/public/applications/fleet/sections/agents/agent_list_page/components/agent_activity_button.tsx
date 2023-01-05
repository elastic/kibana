/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText, EuiTourStep } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useStartServices } from '../../../../hooks';

export const AgentActivityButton: React.FC<{
  onClickAgentActivity: () => void;
  showAgentActivityTour: { isOpen: boolean };
}> = ({ onClickAgentActivity, showAgentActivityTour }) => {
  const { uiSettings } = useStartServices();

  const [agentActivityTourState, setAgentActivityTourState] = useState(showAgentActivityTour);

  const isTourHidden = uiSettings.get('hideAgentActivityTour', false);

  const setTourAsHidden = () => uiSettings.set('hideAgentActivityTour', true);

  useEffect(() => {
    setAgentActivityTourState(showAgentActivityTour);
  }, [showAgentActivityTour, setAgentActivityTourState]);

  const onFinish = () => {
    setAgentActivityTourState({ isOpen: false });
    setTourAsHidden();
  };

  return (
    <>
      <EuiTourStep
        content={
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentActivityButton.tourContent"
              defaultMessage="Review in progress, completed, and scheduled agent action activity history here anytime."
            />
          </EuiText>
        }
        isStepOpen={!isTourHidden && agentActivityTourState.isOpen}
        onFinish={onFinish}
        minWidth={360}
        maxWidth={360}
        step={1}
        stepsTotal={1}
        title={
          <FormattedMessage
            id="xpack.fleet.agentActivityButton.tourTitle"
            defaultMessage="Agent activity history"
          />
        }
        anchorPosition="upCenter"
        footerAction={<EuiButtonEmpty onClick={onFinish}>OK</EuiButtonEmpty>}
        anchor="#agentActivityButton"
      />
      <EuiButtonEmpty
        onClick={() => {
          onClickAgentActivity();
          setAgentActivityTourState({ isOpen: false });
        }}
        data-test-subj="agentActivityButton"
        iconType="clock"
        id="agentActivityButton"
      >
        <FormattedMessage
          id="xpack.fleet.agentList.agentActivityButton"
          defaultMessage="Agent activity"
        />
      </EuiButtonEmpty>
    </>
  );
};
