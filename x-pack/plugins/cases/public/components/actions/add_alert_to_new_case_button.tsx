/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { ReactElement, useMemo } from 'react';
import { Case, CommentType } from '../../../common';
import { CaseAttachments } from '../../types';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesAddToNewCaseFlyout } from '../create/flyout/use_cases_add_to_new_case_flyout';
import { normalizedEventFields, TimelineItem } from './helpers';
import { ACTION_ADD_NEW_CASE } from './translations';

export const AddAlertToNewCaseButton = ({
  isDisabled = false,
  event,
  onFlyoutOpen,
  onSuccess,
}: {
  isDisabled?: boolean;
  event: TimelineItem;
  onFlyoutOpen: Function;
  onSuccess: (theCase: Case) => Promise<void>;
}): ReactElement<EuiContextMenuItem> | null => {
  const { userCanCrud, owner } = useCasesContext();

  const attachments: CaseAttachments = useMemo(() => {
    const eventIndex = event?.ecs._index ?? '';
    const { ruleId, ruleName } = normalizedEventFields(event);
    const eventId = event?.ecs._id ?? '';
    const _attachments = [
      {
        alertId: eventId,
        index: eventIndex ?? '',
        rule: {
          id: ruleId,
          name: ruleName,
        },
        owner: owner[0],
        type: CommentType.alert as const,
      },
    ];
    return _attachments;
  }, [event, owner]);

  const createCaseFlyout = useCasesAddToNewCaseFlyout({
    attachments,
    onSuccess,
  });

  const handleClick = () => {
    onFlyoutOpen();
    createCaseFlyout.open();
  };

  return userCanCrud ? (
    <EuiContextMenuItem
      aria-label={ACTION_ADD_NEW_CASE}
      data-test-subj="cases-actions-add-to-new-case"
      onClick={handleClick}
      // needs forced size="s" since it is lazy loaded and the EuiContextMenuPanel can not initialize the size
      size="s"
      disabled={isDisabled}
    >
      {ACTION_ADD_NEW_CASE}
    </EuiContextMenuItem>
  ) : null;
};
AddAlertToNewCaseButton.displayName = 'AddToNewCaseButton';
