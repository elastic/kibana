/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { Query, Filter } from '@kbn/es-query';
import { EuiButton } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { EDIT_DASHBOARD_BUTTON_TITLE } from '../pages/details/translations';
import { useKibana, useNavigation } from '../../common/lib/kibana';

export interface EditDashboardButtonComponentProps {
  filters?: Filter[];
  query?: Query;
  savedObjectId: string | undefined;
  timeRange: {
    from: string;
    to: string;
    fromStr?: string | undefined;
    toStr?: string | undefined;
  };
}

const EditDashboardButtonComponent: React.FC<EditDashboardButtonComponentProps> = ({
  filters,
  query,
  savedObjectId,
  timeRange,
}) => {
  const {
    services: { dashboard },
  } = useKibana();
  const { navigateTo } = useNavigation();

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      const url = dashboard?.locator?.getRedirectUrl({
        query,
        filters,
        timeRange,
        dashboardId: savedObjectId,
        viewMode: ViewMode.EDIT,
      });
      if (url) {
        navigateTo({ url });
      }
    },
    [dashboard?.locator, query, filters, timeRange, savedObjectId, navigateTo]
  );
  return (
    <EuiButton
      color="primary"
      data-test-subj="dashboardEditButton"
      fill
      iconType="pencil"
      onClick={onClick}
    >
      {EDIT_DASHBOARD_BUTTON_TITLE}
    </EuiButton>
  );
};

EditDashboardButtonComponent.displayName = 'EditDashboardComponent';
export const EditDashboardButton = React.memo(EditDashboardButtonComponent);
