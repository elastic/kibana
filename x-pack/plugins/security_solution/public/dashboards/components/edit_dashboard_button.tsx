/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Query, Filter } from '@kbn/es-query';
import { useDashboardAppLink } from '../hooks/use_dashboard_app_link';
import { EDIT_DASHBOARD_BUTTON_TITLE } from '../pages/details/translations';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import { LinkButton } from '../../common/components/links';

export interface EditDashboardButtonComponentProps {
  dashboardExists: boolean;
  filters?: Filter[];
  query?: Query;
  savedObjectId: string | undefined;
  showWriteControls: boolean;
  timeRange: {
    from: string;
    to: string;
    fromStr?: string | undefined;
    toStr?: string | undefined;
  };
}

const EditDashboardButtonComponent: React.FC<EditDashboardButtonComponentProps> = ({
  dashboardExists,
  filters,
  query,
  savedObjectId,
  showWriteControls,
  timeRange,
}) => {
  const {
    services: { uiSettings },
  } = useKibana();

  const editDashboardUrl = useDashboardAppLink({
    query,
    filters,
    timeRange,
    uiSettings,
    savedObjectId,
  });

  return showWriteControls && dashboardExists ? (
    <LinkButton
      color="primary"
      fill
      iconType="pencil"
      href={editDashboardUrl}
      data-test-subj="dashboardEditButton"
    >
      {EDIT_DASHBOARD_BUTTON_TITLE}
    </LinkButton>
  ) : null;
};

EditDashboardButtonComponent.displayName = 'EditDashboardComponent';
export const EditDashboardButton = React.memo(EditDashboardButtonComponent);
