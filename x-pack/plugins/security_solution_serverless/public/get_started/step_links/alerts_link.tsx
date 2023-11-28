/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { LinkButton } from '@kbn/security-solution-navigation/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';

import React, { useCallback } from 'react';
import { useStepContext } from '../context/step_context';
import { GetStartedWithAlertsCardsId, SectionId, ViewAlertsSteps } from '../types';

const AlertsButtonComponent = () => {
  const { toggleTaskCompleteStatus } = useStepContext();

  const onClick = useCallback(() => {
    toggleTaskCompleteStatus({
      stepId: ViewAlertsSteps.viewAlerts,
      cardId: GetStartedWithAlertsCardsId.viewAlerts,
      sectionId: SectionId.getStartedWithAlerts,
      undo: false,
    });
  }, [toggleTaskCompleteStatus]);

  return (
    <LinkButton id={SecurityPageName.alerts} onClick={onClick} fill>
      <FormattedMessage
        id="xpack.securitySolutionServerless.getStarted.togglePanel.explore.step1.description2.button"
        defaultMessage="View alerts"
      />
    </LinkButton>
  );
};

export const AlertsButton = React.memo(AlertsButtonComponent);
