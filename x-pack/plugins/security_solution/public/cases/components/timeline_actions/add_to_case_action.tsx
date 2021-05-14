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

import { Case, CaseStatuses } from '../../../../../cases/common';
import { APP_ID } from '../../../../common/constants';
import { Ecs } from '../../../../common/ecs';
import { SecurityPageName } from '../../../app/types';
import {
  getCaseDetailsUrl,
  getCreateCaseUrl,
  useFormatUrl,
} from '../../../common/components/link_to';
import { useStateToaster } from '../../../common/components/toasters';
import { useControl } from '../../../common/hooks/use_control';
import { useGetUserSavedObjectPermissions, useKibana } from '../../../common/lib/kibana';
import { ActionIconItem } from '../../../timelines/components/timeline/body/actions/action_icon_item';
import { CreateCaseFlyout } from '../create/flyout';
import { createUpdateSuccessToaster } from './helpers';
import * as i18n from './translations';

interface AddToCaseActionProps {
  ariaLabel?: string;
  ecsRowData: Ecs;
}

interface PostCommentArg {
  caseId: string;
  data: {
    type: 'alert';
    alertId: string | string[];
    index: string | string[];
    rule: { id: string | null; name: string | null };
  };
  updateCase?: (newCase: Case) => void;
  subCaseId?: string;
}

const AddToCaseActionComponent: React.FC<AddToCaseActionProps> = ({
  ariaLabel = i18n.ACTION_ADD_TO_CASE_ARIA_LABEL,
  ecsRowData,
}) => {
  const eventId = ecsRowData._id;
  const eventIndex = ecsRowData._index;
  const rule = ecsRowData.signal?.rule;

  const {
    application: { navigateToApp },
    cases,
  } = useKibana().services;
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
    async (
      theCase: Case,
      postComment?: (arg: PostCommentArg) => Promise<void>,
      updateCase?: (newCase: Case) => void
    ) => {
      closeCaseFlyoutOpen();
      if (postComment) {
        await postComment({
          caseId: theCase.id,
          data: {
            type: 'alert',
            alertId: eventId,
            index: eventIndex ?? '',
            rule: {
              id: rule?.id != null ? rule.id[0] : null,
              name: rule?.name != null ? rule.name[0] : null,
            },
          },
          updateCase,
        });
      }
    },
    [closeCaseFlyoutOpen, eventId, eventIndex, rule]
  );
  const onCaseSuccess = useCallback(
    async (theCase: Case) => {
      closeCaseFlyoutOpen();
      return dispatchToaster({
        type: 'addToaster',
        toast: createUpdateSuccessToaster(theCase, onViewCaseClick),
      });
    },
    [closeCaseFlyoutOpen, dispatchToaster, onViewCaseClick]
  );

  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.case);
  const goToCreateCase = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
        path: getCreateCaseUrl(urlSearch),
      });
    },
    [navigateToApp, urlSearch]
  );
  const [isAllCaseModalOpen, openAllCaseModal] = useState(false);

  const onCaseClicked = useCallback(
    (theCase) => {
      /**
       * No cases listed on the table.
       * The user pressed the add new case table's button.
       * We gonna open the create case modal.
       */
      if (theCase == null) {
        openCaseFlyoutOpen();
      }
      openAllCaseModal(false);
    },
    [openCaseFlyoutOpen]
  );
  const addNewCaseClick = useCallback(() => {
    closePopover();
    openCaseFlyoutOpen();
  }, [openCaseFlyoutOpen, closePopover]);

  const addExistingCaseClick = useCallback(() => {
    closePopover();
    openAllCaseModal(true);
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
          isDisabled={isDisabled}
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
          afterCaseCreated={attachAlertToCase}
          onCloseFlyout={closeCaseFlyoutOpen}
          onSuccess={onCaseSuccess}
        />
      )}
      {isAllCaseModalOpen &&
        cases.getAllCasesSelectorModal({
          alertData: {
            alertId: eventId,
            index: eventIndex ?? '',
            rule: {
              id: rule?.id != null ? rule.id[0] : null,
              name: rule?.name != null ? rule.name[0] : null,
            },
          },
          createCaseNavigation: {
            href: formatUrl(getCreateCaseUrl()),
            onClick: goToCreateCase,
          },
          disabledStatuses: [CaseStatuses.closed],
          onRowClick: onCaseClicked,
          updateCase: onCaseSuccess,
          userCanCrud: userPermissions?.crud ?? false,
        })}
    </>
  );
};

export const AddToCaseAction = memo(AddToCaseActionComponent);
