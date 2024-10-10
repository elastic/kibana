/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useCallback } from 'react';
import { useCasesContext } from '../cases_context/use_cases_context';
import { CaseStatuses } from '../../../common/types/domain';

export const useUserPermissions = ({ status }: { status?: CaseStatuses }) => {
  const { permissions } = useCasesContext();
  const canChangeStatus = useMemo(() => {
    // User has full permissions
    if (permissions.update && permissions.reopenCases) {
      return false;
    } else {
      // When true, we only want to block if the case is closed
      if (status === CaseStatuses.closed) {
        return !permissions.reopenCases;
      } else {
        // Allow the update permission to disable as before
        return !permissions.update;
      }
    }
  }, [status, permissions.update, permissions.reopenCases]);

  const checkShowCommentEditor = useCallback(
    (userActivityQueryParams) => {
      if (permissions.create && userActivityQueryParams.type !== 'action') {
        return permissions.createComment;
      } else if (permissions.createComment && userActivityQueryParams.type !== 'action') {
        return true;
      } else {
        return false;
      }
    },
    [permissions.create, permissions.createComment]
  );

  return { canChangeStatus, checkShowCommentEditor };
};
