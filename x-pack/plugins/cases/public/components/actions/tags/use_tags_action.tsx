/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { useUpdateCases } from '../../../containers/use_bulk_update_case';
import { Case } from '../../../../common';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { UseActionProps } from '../types';
import * as i18n from './translations';

export const useTagsAction = ({ onAction, onActionSuccess, isDisabled }: UseActionProps) => {
  const euiTheme = useEuiTheme();
  const { mutate: updateCases } = useUpdateCases();
  const { permissions } = useCasesContext();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const [selectedCasesToEditTags, setSelectedCasesToEditTags] = useState<Case[]>([]);
  const canUpdateStatus = permissions.update;
  const isActionDisabled = isDisabled || !canUpdateStatus;

  const onFlyoutClosed = useCallback(() => setIsFlyoutOpen(false), []);
  const openFlyout = useCallback(
    (selectedCases: Case[]) => {
      onAction();
      setIsFlyoutOpen(true);
      setSelectedCasesToEditTags(selectedCases);
    },
    [onAction]
  );

  const handleUpdateCaseTags = useCallback(
    (selectedCases: Case[], tags: Case['tags']) => {
      onAction();
      const casesToUpdate = selectedCases.map((theCase) => ({
        tags,
        id: theCase.id,
        version: theCase.version,
      }));

      updateCases(
        {
          cases: casesToUpdate,
          successToasterTitle: '',
        },
        { onSuccess: onActionSuccess }
      );
    },
    [onAction, onActionSuccess]
  );

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
};

export type UseTagsAction = ReturnType<typeof useTagsAction>;
