/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useCasesContext } from '../../cases_context/use_cases_context';
import * as i18n from './translations';
import { UserActionPropertyActions } from './property_actions';

interface Props {
  isLoading: boolean;
  onEdit: () => void;
  onQuote: () => void;
}

const DescriptionPropertyActionsComponent: React.FC<Props> = ({ isLoading, onEdit, onQuote }) => {
  const { permissions } = useCasesContext();

  const propertyActions = useMemo(() => {
    const showEditPencilIcon = permissions.update;
    const showQuoteIcon = permissions.create;

    return [
      ...(showEditPencilIcon
        ? [
            {
              iconType: 'pencil',
              label: i18n.EDIT_DESCRIPTION,
              onClick: onEdit,
            },
          ]
        : []),
      ...(showQuoteIcon
        ? [
            {
              iconType: 'quote',
              label: i18n.QUOTE,
              onClick: onQuote,
            },
          ]
        : []),
    ];
  }, [permissions.update, permissions.create, onEdit, onQuote]);

  return <UserActionPropertyActions isLoading={isLoading} propertyActions={propertyActions} />;
};

DescriptionPropertyActionsComponent.displayName = 'DescriptionPropertyActions';

export const DescriptionPropertyActions = React.memo(DescriptionPropertyActionsComponent);
