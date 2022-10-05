/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '@kbn/cases-plugin/common';
import React, { useCallback, useMemo } from 'react';

import { useGetUserCasesPermissions, useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';

interface UseAddToNewCase {
  indexName: string;
  onClick?: () => void;
}

export const useAddToNewCase = ({ indexName, onClick }: UseAddToNewCase) => {
  const userCasesPermissions = useGetUserCasesPermissions();
  const { cases } = useKibana().services;
  const headerContent = useMemo(
    () => <div>{i18n.CREATE_A_DATA_QUALITY_CASE(indexName)}</div>,
    [indexName]
  );

  const createCaseFlyout = cases.hooks.getUseCasesAddToNewCaseFlyout({
    toastContent: i18n.ADD_TO_CASE_SUCCESS,
  });

  const onAddToNewCase = useCallback(
    (markdownComments: string[]) => {
      if (onClick) {
        onClick();
      }

      const attachments = markdownComments.map((x) => ({
        comment: x,
        type: CommentType.user as const,
      }));

      createCaseFlyout.open({ attachments, headerContent });
    },
    [createCaseFlyout, headerContent, onClick]
  );

  return {
    onAddToNewCase,
    disabled: !userCasesPermissions.create || !userCasesPermissions.read,
  };
};
