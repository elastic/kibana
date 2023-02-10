/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import type { Case } from '../../../../common';
import type { UseActionProps } from '../types';
import { useItemsAction } from '../use_items_action';
import * as i18n from './translations';

export const useTagsAction = ({ onAction, onActionSuccess, isDisabled }: UseActionProps) => {
  const { isFlyoutOpen, onFlyoutClosed, onSaveItems, openFlyout, isActionDisabled } =
    useItemsAction<Case['tags']>({
      fieldKey: 'tags',
      isDisabled,
      onAction,
      onActionSuccess,
      successToasterTitle: i18n.EDITED_CASES,
      fieldSelector: (theCase) => theCase.tags,
      itemsTransformer: (items) => items,
    });

  const getAction = (selectedCases: Case[]) => {
    return {
      name: i18n.EDIT_TAGS,
      onClick: () => openFlyout(selectedCases),
      disabled: isActionDisabled,
      'data-test-subj': 'cases-bulk-action-tags',
      icon: <EuiIcon type="tag" size="m" />,
      key: 'cases-bulk-action-tags',
    };
  };

  return { getAction, isFlyoutOpen, onFlyoutClosed, onSaveTags: onSaveItems };
};

export type UseTagsAction = ReturnType<typeof useTagsAction>;
