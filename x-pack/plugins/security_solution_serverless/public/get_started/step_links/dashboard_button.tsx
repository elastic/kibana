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
import { AddAndValidateYourDataCardsId, SectionId, ViewDashboardSteps } from '../types';
import { useStepContext } from '../context/step_context';

const DashboardButtonComponent = () => {
  const { toggleTaskCompleteStatus } = useStepContext();

  const onClick = useCallback(() => {
    toggleTaskCompleteStatus({
      stepId: ViewDashboardSteps.analyzeData,
      cardId: AddAndValidateYourDataCardsId.viewDashboards,
      sectionId: SectionId.addAndValidateYourData,
      undo: false,
    });
  }, [toggleTaskCompleteStatus]);
  return (
    <LinkButton id={SecurityPageName.dashboards} onClick={onClick} fill>
      <FormattedMessage
        id="xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2.description2.button"
        defaultMessage="Go to dashboards"
      />
    </LinkButton>
  );
};

export const DashboardButton = React.memo(DashboardButtonComponent);
