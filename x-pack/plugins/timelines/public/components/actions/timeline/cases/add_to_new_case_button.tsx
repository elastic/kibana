/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';

import { useAddToCase } from '../../../../hooks/use_add_to_case';
import { AddToCaseActionProps } from './add_to_case_action';
import * as i18n from './translations';

export interface AddToNewCaseButtonProps extends AddToCaseActionProps {
  ariaLabel?: string;
}

const AddToNewCaseButtonComponent: React.FC<AddToNewCaseButtonProps> = ({
  ariaLabel = i18n.ACTION_ADD_TO_CASE_ARIA_LABEL,
  event,
  useInsertTimeline,
  casePermissions,
  appId,
  owner,
  onClose,
}) => {
  const { addNewCaseClick, isDisabled, userCanCrud } = useAddToCase({
    event,
    useInsertTimeline,
    casePermissions,
    appId,
    owner,
    onClose,
  });

  return (
    <>
      {userCanCrud && (
        <EuiContextMenuItem
          aria-label={ariaLabel}
          data-test-subj="add-new-case-item"
          onClick={addNewCaseClick}
          // needs forced size="s" since it is lazy loaded and the EuiContextMenuPanel can not initialize the size
          size="s"
          disabled={isDisabled}
        >
          {i18n.ACTION_ADD_NEW_CASE}
        </EuiContextMenuItem>
      )}
    </>
  );
};
AddToNewCaseButtonComponent.displayName = 'AddToNewCaseButton';

export const AddToNewCaseButton = memo(AddToNewCaseButtonComponent);

// eslint-disable-next-line import/no-default-export
export default AddToNewCaseButton;
