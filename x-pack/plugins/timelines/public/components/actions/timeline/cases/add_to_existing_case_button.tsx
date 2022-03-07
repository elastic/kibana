/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';

import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { TimelinesStartServices } from '../../../../types';
import { useAddToCase } from '../../../../hooks/use_add_to_case';
import { AddToCaseActionProps } from './add_to_case_action';
import * as i18n from './translations';

interface AddToCaseActionButtonProps extends AddToCaseActionProps {
  ariaLabel?: string;
}

const AddToCaseActionButtonComponent: React.FC<AddToCaseActionButtonProps> = ({
  ariaLabel = i18n.ACTION_ADD_TO_CASE_ARIA_LABEL,
  event,
  useInsertTimeline,
  casePermissions,
  appId,
  owner,
  onClose,
}) => {
  const { onCaseSuccess, onCaseClicked, isDisabled, userCanCrud, caseAttachments } = useAddToCase({
    event,
    useInsertTimeline,
    casePermissions,
    appId,
    owner,
    onClose,
  });
  const { cases } = useKibana<TimelinesStartServices>().services;
  const addToCaseModal = cases.hooks.getUseCasesAddToExistingCaseModal({
    attachments: caseAttachments,
    updateCase: onCaseSuccess,
    onRowClick: onCaseClicked,
  });

  // TODO To be further refactored and moved to cases plugins
  // https://github.com/elastic/kibana/issues/123183
  const handleClick = () => {
    // close the popover
    if (onClose) {
      onClose();
    }
    addToCaseModal.open();
  };

  return (
    <>
      {userCanCrud && (
        <EuiContextMenuItem
          aria-label={ariaLabel}
          data-test-subj="add-existing-case-menu-item"
          onClick={handleClick}
          // needs forced size="s" since it is lazy loaded and the EuiContextMenuPanel can not initialize the size
          size="s"
          disabled={isDisabled}
        >
          {i18n.ACTION_ADD_EXISTING_CASE}
        </EuiContextMenuItem>
      )}
    </>
  );
};

export const AddToExistingCaseButton = memo(AddToCaseActionButtonComponent);

// eslint-disable-next-line import/no-default-export
export default AddToExistingCaseButton;
