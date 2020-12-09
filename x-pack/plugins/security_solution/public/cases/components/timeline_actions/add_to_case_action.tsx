/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiText,
  EuiContextMenuItem,
  EuiToolTip,
} from '@elastic/eui';

import { CommentType } from '../../../../../case/common/api';
import { Ecs } from '../../../../common/ecs';
import { ActionIconItem } from '../../../timelines/components/timeline/body/actions/action_icon_item';
import * as i18n from './translations';
import { usePostComment } from '../../containers/use_post_comment';
import { Case } from '../../containers/types';
import { displaySuccessToast, useStateToaster } from '../../../common/components/toasters';
import { useCreateCaseModal } from '../use_create_case_modal';
import { useAllCasesModal } from '../use_all_cases_modal';

interface AddToCaseActionProps {
  ecsRowData: Ecs;
  disabled: boolean;
}

const AddToCaseActionComponent: React.FC<AddToCaseActionProps> = ({ ecsRowData, disabled }) => {
  const eventId = ecsRowData._id;
  const eventIndex = ecsRowData._index;

  const [, dispatchToaster] = useStateToaster();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const openPopover = useCallback(() => setIsPopoverOpen(true), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const { postComment } = usePostComment();
  const attachAlertToCase = useCallback(
    (theCase: Case) => {
      postComment(
        theCase.id,
        {
          type: CommentType.alert,
          alertId: eventId,
          index: eventIndex ?? '',
        },
        () => displaySuccessToast(i18n.CASE_CREATED_SUCCESS_TOAST(theCase.title), dispatchToaster)
      );
    },
    [postComment, eventId, eventIndex, dispatchToaster]
  );

  const { modal: createCaseModal, openModal: openCreateCaseModal } = useCreateCaseModal({
    onCaseCreated: attachAlertToCase,
  });

  const onCaseClicked = useCallback(
    (theCase) => {
      /**
       * No cases listed on the table.
       * The user pressed the add new case table's button.
       * We gonna open the create case modal.
       */
      if (theCase == null) {
        openCreateCaseModal();
        return;
      }

      attachAlertToCase(theCase);
    },
    [attachAlertToCase, openCreateCaseModal]
  );

  const { modal: allCasesModal, openModal: openAllCaseModal } = useAllCasesModal({
    onRowClick: onCaseClicked,
  });

  const addNewCaseClick = useCallback(() => {
    closePopover();
    openCreateCaseModal();
  }, [openCreateCaseModal, closePopover]);

  const addExistingCaseClick = useCallback(() => {
    closePopover();
    openAllCaseModal();
  }, [openAllCaseModal, closePopover]);

  const items = useMemo(
    () => [
      <EuiContextMenuItem
        key="add-new-case-menu-item"
        onClick={addNewCaseClick}
        aria-label={i18n.ACTION_ADD_NEW_CASE}
        data-test-subj="add-new-case-item"
        disabled={disabled}
      >
        <EuiText size="m">{i18n.ACTION_ADD_NEW_CASE}</EuiText>
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="add-existing-case-menu-item"
        onClick={addExistingCaseClick}
        aria-label={i18n.ACTION_ADD_EXISTING_CASE}
        data-test-subj="add-existing-case-menu-item"
        disabled={disabled}
      >
        <EuiText size="m">{i18n.ACTION_ADD_EXISTING_CASE}</EuiText>
      </EuiContextMenuItem>,
    ],
    [addExistingCaseClick, addNewCaseClick, disabled]
  );

  const button = useMemo(
    () => (
      <EuiToolTip
        data-test-subj="attach-alert-to-case-tooltip"
        content={i18n.ACTION_ADD_TO_CASE_TOOLTIP}
      >
        <EuiButtonIcon
          aria-label={i18n.ACTION_ADD_TO_CASE_ARIA_LABEL}
          data-test-subj="attach-alert-to-case-button"
          size="s"
          iconType="folderClosed"
          onClick={openPopover}
          disabled={disabled}
        />
      </EuiToolTip>
    ),
    [disabled, openPopover]
  );

  return (
    <>
      <ActionIconItem id="attachAlertToCase">
        <EuiPopover
          id="attachAlertToCasePanel"
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          repositionOnScroll
        >
          <EuiContextMenuPanel items={items} />
        </EuiPopover>
      </ActionIconItem>
      {createCaseModal}
      {allCasesModal}
    </>
  );
};

export const AddToCaseAction = memo(AddToCaseActionComponent);
