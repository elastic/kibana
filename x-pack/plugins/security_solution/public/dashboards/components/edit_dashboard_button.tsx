/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  EDIT_DASHBOARD_BUTTON_TITLE,
  SAVE_DASHBOARD_BUTTON_TITLE,
} from '../pages/details/translations';

export interface EditDashboardButtonComponentProps {
  onClick?: () => void;
  viewMode?: ViewMode;
  isSaveInProgress?: boolean;
}

const EditDashboardButtonComponent: React.FC<EditDashboardButtonComponentProps> = ({
  onClick,
  viewMode = ViewMode.VIEW,
  isSaveInProgress,
}) => {
  return (
    <EuiButton
      color="primary"
      data-test-subj="dashboardEditButton"
      fill
      iconType={viewMode === ViewMode.EDIT ? 'save' : 'pencil'}
      onClick={onClick}
      isLoading={isSaveInProgress}
    >
      {viewMode === ViewMode.EDIT ? SAVE_DASHBOARD_BUTTON_TITLE : EDIT_DASHBOARD_BUTTON_TITLE}
    </EuiButton>
  );
};

EditDashboardButtonComponent.displayName = 'EditDashboardComponent';
export const EditDashboardButton = React.memo(EditDashboardButtonComponent);
