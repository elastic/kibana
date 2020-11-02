/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import { PropertyActions } from '../property_actions';

interface UserActionPropertyActionsProps {
  id: string;
  editLabel: string;
  quoteLabel: string;
  disabled: boolean;
  isLoading: boolean;
  onEdit: (id: string) => void;
  onQuote: (id: string) => void;
}

const UserActionPropertyActionsComponent = ({
  id,
  editLabel,
  quoteLabel,
  disabled,
  isLoading,
  onEdit,
  onQuote,
}: UserActionPropertyActionsProps) => {
  const onEditClick = useCallback(() => onEdit(id), [id, onEdit]);
  const onQuoteClick = useCallback(() => onQuote(id), [id, onQuote]);

  const propertyActions = useMemo(() => {
    return [
      {
        disabled,
        iconType: 'pencil',
        label: editLabel,
        onClick: onEditClick,
      },
      {
        disabled,
        iconType: 'quote',
        label: quoteLabel,
        onClick: onQuoteClick,
      },
    ];
  }, [disabled, editLabel, quoteLabel, onEditClick, onQuoteClick]);
  return (
    <>
      {isLoading && <EuiLoadingSpinner data-test-subj="user-action-title-loading" />}
      {!isLoading && <PropertyActions propertyActions={propertyActions} />}
    </>
  );
};

export const UserActionPropertyActions = memo(UserActionPropertyActionsComponent);
