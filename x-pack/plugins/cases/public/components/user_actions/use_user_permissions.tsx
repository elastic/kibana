/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useCallback } from 'react';
import { useCasesContext } from '../cases_context/use_cases_context';
import { CaseStatuses } from '../../../common/types/domain';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

export const useUserPermissions = ({
  newStatusToAuthorize,
}: {
  newStatusToAuthorize?: CaseStatuses;
}) => {
  const { permissions } = useCasesContext();
  const canChangeStatus = useMemo(() => {
    if (!permissions.update) return false;
    if (!permissions.reopenCase && newStatusToAuthorize === CaseStatuses.closed) return false;
    return true;
  }, [newStatusToAuthorize, permissions.update, permissions.reopenCase]);

  const canAddUserComments = useCallback(
    (userActivityQueryParams: UserActivityParams) => {
      if (userActivityQueryParams.type === 'action') return false;
      return permissions.createComment;
    },
    [permissions.createComment]
  );

  return { canChangeStatus, canAddUserComments };
};
