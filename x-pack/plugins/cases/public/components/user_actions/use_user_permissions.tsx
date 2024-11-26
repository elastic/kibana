/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

export const useUserPermissions = () => {
  const { permissions } = useCasesContext();

  /**
   * Determines if a user has the capability to update the case. Reopening a case is not part of this capability.
   */

  const canUpdate = permissions.update;

  /**
   * Determines if a user has the capability to change the case from closed => open or closed => in progress
   */

  const canReopenCase = permissions.reopenCase;

  /**
   * Determines if a user has the capability to add comments and attachments
   */
  const getCanAddUserComments = useCallback(
    (userActivityQueryParams: UserActivityParams) => {
      if (userActivityQueryParams.type === 'action') return false;
      return permissions.createComment;
    },
    [permissions.createComment]
  );

  return { getCanAddUserComments, canReopenCase, canUpdate };
};
