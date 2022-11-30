/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import type { PropertyActionButtonProps } from '../../property_actions';
import { PropertyActions } from '../../property_actions';

interface Props {
  isLoading: boolean;
  propertyActions: PropertyActionButtonProps[];
}

const UserActionPropertyActionsComponent: React.FC<Props> = ({ isLoading, propertyActions }) => {
  if (propertyActions.length === 0) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      {isLoading ? (
        <EuiLoadingSpinner data-test-subj="user-action-title-loading" />
      ) : (
        <PropertyActions propertyActions={propertyActions} />
      )}
    </EuiFlexItem>
  );
};

UserActionPropertyActionsComponent.displayName = 'UserActionPropertyActions';

export const UserActionPropertyActions = React.memo(UserActionPropertyActionsComponent);
