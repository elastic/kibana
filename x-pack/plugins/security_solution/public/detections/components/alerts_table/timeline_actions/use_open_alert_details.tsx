/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiContextMenuItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { getAlertDetailsUrl } from '../../../../common/components/link_to';
import { SecurityPageName } from '../../../../../common/constants';

interface Props {
  ruleId?: string;
  closePopover: () => void;
  eventId: string;
}

export const ACTION_OPEN_ALERT_DETAILS_PAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.openAlertDetails',
  {
    defaultMessage: 'Open alert details page',
  }
);

export const useOpenAlertDetailsAction = ({ ruleId, closePopover, eventId }: Props) => {
  const isAlertDetailsPageEnabled = useIsExperimentalFeatureEnabled('alertDetailsPageEnabled');
  const alertDetailsActionItems = [];
  const { onClick: goToAlertDetails } = useGetSecuritySolutionLinkProps()({
    deepLinkId: SecurityPageName.alerts,
    path: getAlertDetailsUrl(eventId),
  });

  const handleMenuClick = useCallback(
    (ev) => {
      ev.preventDefault();
      goToAlertDetails(ev);
      closePopover();
    },
    [closePopover, goToAlertDetails]
  );

  // We check ruleId to confirm this is an alert, as this page does not support events as of 8.6
  if (ruleId && eventId && isAlertDetailsPageEnabled) {
    alertDetailsActionItems.push(
      <EuiContextMenuItem
        key="open-alert-details-item"
        data-test-subj="open-alert-details-page-menu-item"
        onClick={handleMenuClick}
      >
        {ACTION_OPEN_ALERT_DETAILS_PAGE} <EuiIcon type="link" />
      </EuiContextMenuItem>
    );
  }

  return {
    alertDetailsActionItems,
  };
};
