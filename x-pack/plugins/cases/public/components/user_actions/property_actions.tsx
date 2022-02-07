/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import { PropertyActions } from '../property_actions';
import { useLensOpenVisualization } from '../markdown_editor/plugins/lens/use_lens_open_visualization';

interface UserActionPropertyActionsProps {
  id: string;
  editLabel: string;
  quoteLabel: string;
  isLoading: boolean;
  onEdit: (id: string) => void;
  onQuote: (id: string) => void;
  userCanCrud: boolean;
  commentMarkdown: string;
}

const UserActionPropertyActionsComponent = ({
  id,
  editLabel,
  quoteLabel,
  isLoading,
  onEdit,
  onQuote,
  userCanCrud,
  commentMarkdown,
}: UserActionPropertyActionsProps) => {
  const { canUseEditor, actionConfig } = useLensOpenVisualization({ comment: commentMarkdown });
  const onEditClick = useCallback(() => onEdit(id), [id, onEdit]);
  const onQuoteClick = useCallback(() => onQuote(id), [id, onQuote]);

  const propertyActions = useMemo(
    () =>
      [
        userCanCrud
          ? [
              {
                iconType: 'pencil',
                label: editLabel,
                onClick: onEditClick,
              },
              {
                iconType: 'quote',
                label: quoteLabel,
                onClick: onQuoteClick,
              },
            ]
          : [],
        canUseEditor && actionConfig ? [actionConfig] : [],
      ].flat(),
    [userCanCrud, editLabel, onEditClick, quoteLabel, onQuoteClick, canUseEditor, actionConfig]
  );

  if (!propertyActions.length) {
    return null;
  }

  return (
    <>
      {isLoading && <EuiLoadingSpinner data-test-subj="user-action-title-loading" />}
      {!isLoading && <PropertyActions propertyActions={propertyActions} />}
    </>
  );
};
UserActionPropertyActionsComponent.displayName = 'UserActionPropertyActions';

export const UserActionPropertyActions = memo(UserActionPropertyActionsComponent);
