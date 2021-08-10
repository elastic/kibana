/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import {
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiText,
  EuiContextMenuItem,
  EuiToolTip,
  EuiPortal,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { CaseStatuses, StatusAll } from '../../../../../../cases/common';
import { Ecs } from '../../../../../common/ecs';
import { useAddToCase } from '../../../../hooks/use_add_to_case';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { TimelinesStartServices } from '../../../../types';
import { CreateCaseFlyout } from './create/flyout';
import { AddToCaseActionButton } from './add_to_case_action_button';
import { tGridActions } from '../../../../';
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
  closeCallbacks: Function[];
}

const AddToCaseActionComponent: React.FC<AddToCaseActionProps> = ({
  ariaLabel = i18n.ACTION_ADD_TO_CASE_ARIA_LABEL,
  ecsRowData,
  useInsertTimeline,
  casePermissions,
  appId,
  closeCallbacks = [],
}) => {
  const eventId = ecsRowData._id;
  const eventIndex = ecsRowData._index;
  const rule = ecsRowData.signal?.rule;
  const dispatch = useDispatch();
  const { cases } = useKibana<TimelinesStartServices>().services;
  const {
    addNewCaseClick,
    addExistingCaseClick,
    onCaseClicked,
    goToCreateCase,
    onCaseSuccess,
    attachAlertToCase,
    createCaseUrl,
    isAllCaseModalOpen,
    isDisabled,
    userCanCrud,
    isEventSupported,
    openPopover,
    closePopover,
    isPopoverOpen,
    isCreateCaseFlyoutOpen,
  } = useAddToCase({ ecsRowData, useInsertTimeline, casePermissions, appId, closeCallbacks });

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

  const closeCaseFlyoutOpen = useCallback(() => {
    dispatch(tGridActions.setOpenAddToNewCase({ id: eventId, isOpen: false }));
  }, [dispatch, eventId]);

  return (
    <>
      <AddToCaseActionButton
        ariaLabel={ariaLabel}
        ecsRowData={ecsRowData}
        useInsertTimeline={useInsertTimeline}
        casePermissions={casePermissions}
        appId={appId}
      />
      {isCreateCaseFlyoutOpen && (
        <EuiPortal>
          <CreateCaseFlyout
            afterCaseCreated={attachAlertToCase}
            onCloseFlyout={closeCaseFlyoutOpen}
            onSuccess={onCaseSuccess}
            useInsertTimeline={useInsertTimeline}
            appId={appId}
          />
        </EuiPortal>
      )}
      {isAllCaseModalOpen && (
        <EuiPortal>{cases.getAllCasesSelectorModal(getAllCasesSelectorModalProps)}</EuiPortal>
      )}
    </>
  );
};

export const AddToCaseAction = memo(AddToCaseActionComponent);

// eslint-disable-next-line import/no-default-export
export default AddToCaseAction;
