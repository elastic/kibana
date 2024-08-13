/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { LinkButton } from '@kbn/security-solution-navigation/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { SectionId, CardId } from '../types';
import { useStepContext } from '../context/card_context';
import { AddIntegrationCallout } from './add_integration_callout';
import { GO_TO_DASHBOARDS, VIEW_DASHBOARDS_CALLOUT_TITLE } from './translations';

const DashboardButtonComponent = () => {
  const { toggleTaskCompleteStatus, finishedCardIds, onStepLinkClicked } = useStepContext();
  const isIntegrationsStepComplete = finishedCardIds?.has(CardId.addIntegrations);

  const onClick = useCallback(() => {
    onStepLinkClicked({
      originStepId: CardId.viewDashboards,
      stepLinkId: SecurityPageName.dashboards,
    });
    toggleTaskCompleteStatus({
      cardId: CardId.viewDashboards,
      stepLinkId: SecurityPageName.dashboards,
      sectionId: SectionId.addAndValidateYourData,
      undo: false,
      trigger: 'click',
    });
  }, [onStepLinkClicked, toggleTaskCompleteStatus]);
  return (
    <>
      {!isIntegrationsStepComplete && (
        <AddIntegrationCallout
          stepName={VIEW_DASHBOARDS_CALLOUT_TITLE}
          cardId={CardId.viewDashboards}
        />
      )}

      <LinkButton
        className="step-paragraph"
        disabled={!isIntegrationsStepComplete}
        fill
        id={SecurityPageName.dashboards}
        onClick={onClick}
      >
        {GO_TO_DASHBOARDS}
      </LinkButton>
    </>
  );
};

export const DashboardButton = React.memo(DashboardButtonComponent);
