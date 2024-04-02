/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LinkButton } from '@kbn/security-solution-navigation/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';

import React, { useCallback } from 'react';
import { useStepContext } from '../context/step_context';
import {
  AddAndValidateYourDataCardsId,
  AddIntegrationsSteps,
  GetStartedWithAlertsCardsId,
  SectionId,
  ViewAlertsSteps,
} from '../types';
import { AddIntegrationCallout } from './add_integration_callout';
import { VIEW_ALERTS, VIEW_ALERTS_CALLOUT_TITLE } from './translations';

const AlertsButtonComponent = () => {
  const { toggleTaskCompleteStatus, finishedSteps } = useStepContext();
  const isIntegrationsStepComplete = finishedSteps[
    AddAndValidateYourDataCardsId.addIntegrations
  ]?.has(AddIntegrationsSteps.connectToDataSources);

  const onClick = useCallback(() => {
    toggleTaskCompleteStatus({
      stepId: ViewAlertsSteps.viewAlerts,
      cardId: GetStartedWithAlertsCardsId.viewAlerts,
      sectionId: SectionId.getStartedWithAlerts,
      undo: false,
    });
  }, [toggleTaskCompleteStatus]);

  return (
    <>
      {!isIntegrationsStepComplete && (
        <AddIntegrationCallout stepName={VIEW_ALERTS_CALLOUT_TITLE} />
      )}
      <LinkButton
        className="step-paragraph"
        disabled={!isIntegrationsStepComplete}
        fill
        id={SecurityPageName.alerts}
        onClick={onClick}
      >
        {VIEW_ALERTS}
      </LinkButton>
    </>
  );
};

export const AlertsButton = React.memo(AlertsButtonComponent);
