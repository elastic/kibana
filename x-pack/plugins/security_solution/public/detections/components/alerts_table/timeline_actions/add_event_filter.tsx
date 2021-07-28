/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiText } from '@elastic/eui';
import React from 'react';
import * as i18n from '../translations';

interface AddEventFilterProps {
  onClick: () => void;
  disabled?: boolean;
}

const AddEventFilterComponent: React.FC<AddEventFilterProps> = ({ onClick, disabled }) => {
  return (
    <EuiContextMenuItem
      key="add-event-filter-menu-item"
      aria-label={i18n.ACTION_ADD_EVENT_FILTER}
      data-test-subj="add-event-filter-menu-item"
      id="addEventFilter"
      onClick={onClick}
      disabled={disabled}
    >
      <EuiText data-test-subj="addEventFilterButton" size="m">
        {i18n.ACTION_ADD_EVENT_FILTER}
      </EuiText>
    </EuiContextMenuItem>
  );
};

export const AddEventFilter = React.memo(AddEventFilterComponent);
