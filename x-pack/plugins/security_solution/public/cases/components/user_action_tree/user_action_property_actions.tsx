/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { EuiToolTip, EuiButtonIcon, EuiFlexItem } from '@elastic/eui';

import { PropertyActions } from '../property_actions';
import * as i18n from './translations';

interface UserActionPropertyActionsProps {
  id: string;
  editLabel: string;
  quoteLabel: string;
  disabled: boolean;
  onEdit: (id: string) => void;
  onQuote: (id: string) => void;
}

const UserActionPropertyActionsComponent = ({
  id,
  editLabel,
  quoteLabel,
  disabled,
  onEdit,
  onQuote,
}: UserActionPropertyActionsProps) => {
  const propertyActions = useMemo(() => {
    return [
      {
        disabled,
        iconType: 'pencil',
        label: editLabel,
        onClick: () => onEdit(id),
      },
      {
        disabled,
        iconType: 'quote',
        label: quoteLabel,
        onClick: () => onQuote(id),
      },
    ];
  }, [disabled, id, editLabel, onEdit, quoteLabel, onQuote]);

  return <PropertyActions propertyActions={propertyActions} />;
};

export const UserActionPropertyActions = memo(UserActionPropertyActionsComponent);
