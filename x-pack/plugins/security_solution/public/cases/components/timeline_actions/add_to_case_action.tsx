/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiText,
  EuiContextMenuItem,
  EuiToolTip,
} from '@elastic/eui';

import { CommentType, CaseStatuses } from '../../../../../cases/common/api';
import { Ecs } from '../../../../common/ecs';
import { ActionIconItem } from '../../../timelines/components/timeline/body/actions/action_icon_item';
import { usePostComment } from '../../containers/use_post_comment';
import { Case } from '../../containers/types';
import { useStateToaster } from '../../../common/components/toasters';
import { APP_ID } from '../../../../common/constants';
import { useGetUserSavedObjectPermissions, useKibana } from '../../../common/lib/kibana';
import { getCaseDetailsUrl } from '../../../common/components/link_to';
import { SecurityPageName } from '../../../app/types';
import { useAllCasesModal } from '../use_all_cases_modal';
import { createUpdateSuccessToaster } from './helpers';
import * as i18n from './translations';
import { useControl } from '../../../common/hooks/use_control';
import { CreateCaseFlyout } from '../create/flyout';

interface AddToCaseActionProps {
  ariaLabel?: string;
  ecsRowData: Ecs;
}

const AddToCaseActionComponent: React.FC<AddToCaseActionProps> = ({
  ariaLabel = i18n.ACTION_ADD_TO_CASE_ARIA_LABEL,
  ecsRowData,
}) => {
  const eventId = ecsRowData._id;
  const eventIndex = ecsRowData._index;
  const rule = ecsRowData.signal?.rule;

  const { navigateToApp } = useKibana().services.application;
  const [, dispatchToaster] = useStateToaster();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const openPopover = useCallback(() => setIsPopoverOpen(true), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const userPermissions = useGetUserSavedObjectPermissions();

  const isEventSupported = !isEmpty(ecsRowData.signal?.rule?.id);
  const userCanCrud = userPermissions?.crud ?? false;
  const isDisabled = !userCanCrud || !isEventSupported;
  const tooltipContext = userCanCrud
    ? isEventSupported
      ? i18n.ACTION_ADD_TO_CASE_TOOLTIP
      : i18n.UNSUPPORTED_EVENTS_MSG
    : i18n.PERMISSIONS_MSG;

  const { postComment } = usePostComment();

  const onViewCaseClick = useCallback(
    (id) => {
      navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
        path: getCaseDetailsUrl({ id }),
      });
    },
    [navigateToApp]
  );

  const {
    isControlOpen: isCreateCaseFlyoutOpen,
    openControl: openCaseFlyoutOpen,
    closeControl: closeCaseFlyoutOpen,
  } = useControl();

  const attachAlertToCase = useCallback(
    async (theCase: Case, updateCase?: (newCase: Case) => void) => {
      closeCaseFlyoutOpen();
      await postComment({
        caseId: theCase.id,
        data: {
          type: CommentType.alert,
          alertId: eventId,
          index: eventIndex ?? '',
          rule: {
            id: rule?.id != null ? rule.id[0] : null,
            name: rule?.name != null ? rule.name[0] : null,
          },
        },
        updateCase,
      });
    },
    [closeCaseFlyoutOpen, postComment, eventId, eventIndex, rule]
  );

  const onCaseSuccess = useCallback(
    async (theCase: Case) =>
      dispatchToaster({
        type: 'addToaster',
        toast: createUpdateSuccessToaster(theCase, onViewCaseClick),
      }),
    [dispatchToaster, onViewCaseClick]
  );

  const onCaseClicked = useCallback(
    (theCase) => {
      /**
       * No cases listed on the table.
       * The user pressed the add new case table's button.
       * We gonna open the create case modal.
       */
      if (theCase == null) {
        openCaseFlyoutOpen();
        return;
      }

      attachAlertToCase(theCase, onCaseSuccess);
    },
    [attachAlertToCase, onCaseSuccess, openCaseFlyoutOpen]
  );

  const { modal: allCasesModal, openModal: openAllCaseModal } = useAllCasesModal({
    disabledStatuses: [CaseStatuses.closed],
    onRowClick: onCaseClicked,
  });

  const addNewCaseClick = useCallback(() => {
    closePopover();
    openCaseFlyoutOpen();
  }, [openCaseFlyoutOpen, closePopover]);

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
        disabled={isDisabled}
      >
        <EuiText size="m">{i18n.ACTION_ADD_NEW_CASE}</EuiText>
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="add-existing-case-menu-item"
        onClick={addExistingCaseClick}
        aria-label={i18n.ACTION_ADD_EXISTING_CASE}
        data-test-subj="add-existing-case-menu-item"
        disabled={isDisabled}
      >
        <EuiText size="m">{i18n.ACTION_ADD_EXISTING_CASE}</EuiText>
      </EuiContextMenuItem>,
    ],
    [addExistingCaseClick, addNewCaseClick, isDisabled]
  );

  const button = useMemo(
    () => (
      <EuiToolTip data-test-subj="attach-alert-to-case-tooltip" content={tooltipContext}>
        <EuiButtonIcon
          aria-label={ariaLabel}
          data-test-subj="attach-alert-to-case-button"
          size="s"
          iconType="folderClosed"
          onClick={openPopover}
          disabled={isDisabled}
        />
      </EuiToolTip>
    ),
    [ariaLabel, isDisabled, openPopover, tooltipContext]
  );

  return (
    <>
      <ActionIconItem>
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
      {isCreateCaseFlyoutOpen && (
        <CreateCaseFlyout
          onCloseFlyout={closeCaseFlyoutOpen}
          afterCaseCreated={attachAlertToCase}
          onSuccess={onCaseSuccess}
        />
      )}
      {allCasesModal}
    </>
  );
};

export const AddToCaseAction = memo(AddToCaseActionComponent);
