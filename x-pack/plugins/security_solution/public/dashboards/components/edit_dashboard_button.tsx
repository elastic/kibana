/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';

export interface EditDashboardButtonComponentProps {
  actions: Array<{
    action: () => void;
    isSaveInProgress: boolean;
    iconType?: string;
    title: string;
    buttonType?: 'fill';
    id: string;
  }>;
}

const EditDashboardButtonComponent: React.FC<EditDashboardButtonComponentProps> = ({ actions }) => {
  return (
    <>
      {actions.map<React.ReactElement>(
        ({ id, title, action, isSaveInProgress, iconType, buttonType }) => {
          return buttonType === 'fill' ? (
            <EuiButton
              color="primary"
              data-test-subj={id}
              fill
              iconType={iconType}
              isLoading={isSaveInProgress}
              onClick={action}
              key={id}
            >
              {title}
            </EuiButton>
          ) : (
            <EuiButtonEmpty
              data-test-subj={id}
              isLoading={isSaveInProgress}
              onClick={action}
              key={id}
            >
              {title}
            </EuiButtonEmpty>
          );
        }
      )}
    </>
  );
};

EditDashboardButtonComponent.displayName = 'EditDashboardComponent';
export const EditDashboardButton = React.memo(EditDashboardButtonComponent);
