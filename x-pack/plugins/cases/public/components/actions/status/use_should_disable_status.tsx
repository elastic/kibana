/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { CasesUI } from '../../../../common';
import { CaseStatuses } from '../../../../common/types/domain';

import { useUserPermissions } from '../../user_actions/use_user_permissions';

const nonClosedCaseStatuses = [CaseStatuses.open, CaseStatuses['in-progress']];

export const useShouldDisableStatus = () => {
  const { canUpdate, canReopenCase } = useUserPermissions();

  const shouldDisableStatusFn = useCallback(
    (selectedCases: Array<Pick<CasesUI[number], 'status'>>, nextStatusOption: CaseStatuses) => {
      // Read Only + Disabled => Cannot do anything
      const noChangePermissions = !canUpdate && !canReopenCase;
      if (noChangePermissions) return true;

      // All + Enabled reopen => can change status at any point in any way
      if (canUpdate && canReopenCase) return false;

      const noop = selectedCases.every((theCase) => theCase.status === nextStatusOption);
      if (noop) return true;

      // If any of the selected cases match, disable the option based on user permissions
      return selectedCases.some((theCase) => {
        const currentStatus = theCase.status;
        // Read Only + Enabled => Can only reopen a case (pointless, but an option)
        if (!canUpdate && canReopenCase) {
          // Disable the status if any of the selected cases is 'open' or 'in-progress'
          return currentStatus !== CaseStatuses.closed;
        }

        // All + Disabled reopen => Can change status, but once closed, case is closed for good for this user
        if (canUpdate && !canReopenCase) {
          // Disabel the status if any of the selected cases is 'closed'
          return (
            nonClosedCaseStatuses.includes(nextStatusOption) &&
            currentStatus === CaseStatuses.closed
          );
        }

        return true;
      });
    },
    [canReopenCase, canUpdate]
  );

  return shouldDisableStatusFn;
};
