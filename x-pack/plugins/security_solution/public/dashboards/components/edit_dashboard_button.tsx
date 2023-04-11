/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Query, Filter } from '@kbn/es-query';
import { EuiButton } from '@elastic/eui';
import { useDashboardAppLink } from '../hooks/use_dashboard_app_link';
import { EDIT_DASHBOARD_BUTTON_TITLE } from '../pages/details/translations';
import { useKibana } from '../../common/lib/kibana';

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
    services: { uiSettings },
  } = useKibana();

  const { onClick } = useDashboardAppLink({
    query,
    filters,
    timeRange,
    uiSettings,
    savedObjectId,
  });

  return (
    <EuiButton
      color="primary"
      fill
      iconType="pencil"
      onClick={onClick}
      data-test-subj="dashboardEditButton"
    >
      {EDIT_DASHBOARD_BUTTON_TITLE}
    </EuiButton>
  );
};

EditDashboardButtonComponent.displayName = 'EditDashboardComponent';
export const EditDashboardButton = React.memo(EditDashboardButtonComponent);
