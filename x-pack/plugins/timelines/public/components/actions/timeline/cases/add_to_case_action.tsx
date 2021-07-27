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

import { Case, CaseStatuses, StatusAll } from '../../../../../../cases/common';
import { Ecs } from '../../../../../common/ecs';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { TimelinesStartServices } from '../../../../types';
import { ActionIconItem } from '../../action_icon_item';
import { CreateCaseFlyout } from './create/flyout';
import { createUpdateSuccessToaster } from './helpers';
import * as i18n from './translations';

export interface AddToCaseActionProps {
  ariaLabel?: string;
  ecsRowData: Ecs;
  useInsertTimeline?: Function;
  casePermissions: {
    crud: boolean;
    read: boolean;
  } | null;
  appId: string;
}
interface UseControlsReturn {
  isControlOpen: boolean;
  openControl: () => void;
  closeControl: () => void;
}

const appendSearch = (search?: string) =>
  isEmpty(search) ? '' : `${search?.startsWith('?') ? search : `?${search}`}`;

const getCreateCaseUrl = (search?: string | null) => `/create${appendSearch(search ?? undefined)}`;

const getCaseDetailsUrl = ({
  id,
  search,
  subCaseId,
}: {
  id: string;
  search?: string | null;
  subCaseId?: string;
}) => {
  if (subCaseId) {
    return `/${encodeURIComponent(id)}/sub-cases/${encodeURIComponent(subCaseId)}${appendSearch(
      search ?? undefined
    )}`;
  }
  return `/${encodeURIComponent(id)}${appendSearch(search ?? undefined)}`;
};
interface PostCommentArg {
  caseId: string;
  data: {
    type: 'alert';
    alertId: string | string[];
    index: string | string[];
    rule: { id: string | null; name: string | null };
    owner: string;
  };
  updateCase?: (newCase: Case) => void;
  subCaseId?: string;
}

const AddToCaseActionComponent: React.FC<AddToCaseActionProps> = ({
  ariaLabel = i18n.ACTION_ADD_TO_CASE_ARIA_LABEL,
  ecsRowData,
  useInsertTimeline,
  casePermissions,
  appId,
}) => {
  const eventId = ecsRowData._id;
  const eventIndex = ecsRowData._index;
  const rule = ecsRowData.signal?.rule;
  console.log(appId);
  const {
    application: { navigateToApp, getUrlForApp },
    cases,
    notifications: { toasts },
  } = useKibana<TimelinesStartServices>().services;

  const useControl = (): UseControlsReturn => {
    const [isControlOpen, setIsControlOpen] = useState<boolean>(false);
    const openControl = useCallback(() => setIsControlOpen(true), []);
    const closeControl = useCallback(() => setIsControlOpen(false), []);

    return { isControlOpen, openControl, closeControl };
  };
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const openPopover = useCallback(() => setIsPopoverOpen(true), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  //const isEventSupported = !isEmpty(ecsRowData.signal?.rule?.id);
  const isEventSupported = true;
  const userCanCrud = casePermissions?.crud ?? false;
  const isDisabled = !userCanCrud || !isEventSupported;
  const tooltipContext = userCanCrud
    ? isEventSupported
      ? i18n.ACTION_ADD_TO_CASE_TOOLTIP
      : i18n.UNSUPPORTED_EVENTS_MSG
    : i18n.PERMISSIONS_MSG;

  const onViewCaseClick = useCallback(
    (id) => {
      navigateToApp(appId, {
        deepLinkId: 'case',
        path: getCaseDetailsUrl({ id }),
      });
    },
    [navigateToApp, appId]
  );
  const currentSearch = window.location.search;
  const urlSearch = useMemo(() => currentSearch, [currentSearch]);
  const createCaseUrl = useMemo(() => getUrlForApp('cases') + getCreateCaseUrl(urlSearch), [
    getUrlForApp,
    urlSearch,
  ]);

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
            owner: appId,
          },
          updateCase,
        });
      }
    },
    [closeCaseFlyoutOpen, eventId, eventIndex, rule, appId]
  );
  const onCaseSuccess = useCallback(
    async (theCase: Case) => {
      closeCaseFlyoutOpen();
      createUpdateSuccessToaster(toasts, theCase, onViewCaseClick);
    },
    [closeCaseFlyoutOpen, onViewCaseClick, toasts]
  );

  const goToCreateCase = useCallback(
    async (ev) => {
      ev.preventDefault();
      return navigateToApp('securitySolution', {
        deepLinkId: 'case',
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

  const getAllCasesSelectorModalProps = useMemo(() => {
    return {
      alertData: {
        alertId: eventId,
        index: eventIndex ?? '',
        rule: {
          id: rule?.id != null ? rule.id[0] : null,
          name: rule?.name != null ? rule.name[0] : null,
        },
        owner: appId,
      },
      createCaseNavigation: {
        href: createCaseUrl,
        onClick: goToCreateCase,
      },
      hiddenStatuses: [CaseStatuses.closed, StatusAll],
      onRowClick: onCaseClicked,
      updateCase: onCaseSuccess,
      userCanCrud: casePermissions?.crud ?? false,
      owner: [appId],
    };
  }, [
    casePermissions?.crud,
    onCaseSuccess,
    onCaseClicked,
    createCaseUrl,
    goToCreateCase,
    eventId,
    eventIndex,
    rule?.id,
    rule?.name,
    appId,
  ]);

  return (
    <>
      {userCanCrud && (
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
      )}
      {isCreateCaseFlyoutOpen && (
        <CreateCaseFlyout
          afterCaseCreated={attachAlertToCase}
          onCloseFlyout={closeCaseFlyoutOpen}
          onSuccess={onCaseSuccess}
          useInsertTimeline={useInsertTimeline}
          appId={appId}
        />
      )}
      {isAllCaseModalOpen && cases.getAllCasesSelectorModal(getAllCasesSelectorModalProps)}
    </>
  );
};

export const AddToCaseAction = memo(AddToCaseActionComponent);

// eslint-disable-next-line import/no-default-export
export default AddToCaseAction;
