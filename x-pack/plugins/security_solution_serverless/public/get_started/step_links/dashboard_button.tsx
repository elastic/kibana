/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { LinkButton } from '@kbn/security-solution-navigation/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import {
  AddAndValidateYourDataCardsId,
  AddIntegrationsSteps,
  SectionId,
  ViewDashboardSteps,
} from '../types';
import { useStepContext } from '../context/step_context';
import { AddIntegrationCallout } from './add_integration_callout';
import { VIEW_DASHBOARDS } from './translations';

const DashboardButtonComponent = () => {
  const { toggleTaskCompleteStatus, finishedSteps } = useStepContext();
  const isIntegrationsStepComplete = finishedSteps[
    AddAndValidateYourDataCardsId.addIntegrations
  ]?.has(AddIntegrationsSteps.connectToDataSources);

  const onClick = useCallback(() => {
    toggleTaskCompleteStatus({
      stepId: ViewDashboardSteps.analyzeData,
      cardId: AddAndValidateYourDataCardsId.viewDashboards,
      sectionId: SectionId.addAndValidateYourData,
      undo: false,
    });
  }, [toggleTaskCompleteStatus]);
  return (
    <>
      {!isIntegrationsStepComplete && <AddIntegrationCallout stepName={VIEW_DASHBOARDS} />}

      <LinkButton
        className="step-paragraph"
        disabled={!isIntegrationsStepComplete}
        fill
        id={SecurityPageName.dashboards}
        onClick={onClick}
      >
        <FormattedMessage
          id="xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2.description2.button"
          defaultMessage="Go to dashboards"
        />
      </LinkButton>
    </>
  );
};

export const DashboardButton = React.memo(DashboardButtonComponent);
