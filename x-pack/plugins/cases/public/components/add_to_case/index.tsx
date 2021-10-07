/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useEffect } from 'react';
import { CaseStatuses, StatusAll, TimelineItem } from '../../../common';
import { useAddToCase, normalizedEventFields } from './use_add_to_case';
import { useAppDispatch } from '../utils';
import { CreateCaseFlyout } from './flyout';
import { AllCasesSelectorModal } from '../all_cases/selector_modal';
import { setOpenAddToExistingCase, setOpenAddToNewCase } from '../../store/reducer';
import * as i18n from './translations';

export interface AddToCaseActionProps {
  ariaLabel?: string;
  event?: TimelineItem;
  useInsertTimeline?: Function;
  casePermissions: {
    crud: boolean;
    read: boolean;
  } | null;
  appId: string;
  onClose?: Function;
  disableAlerts?: boolean;
  type?: 'new' | 'existing';
  // expose the id of the selected event via a callback
  setActiveCaseFlowId?: Function;
}

const AddToCaseActionComponent: React.FC<AddToCaseActionProps> = ({
  ariaLabel = i18n.ACTION_ADD_TO_CASE_ARIA_LABEL,
  event,
  useInsertTimeline,
  casePermissions,
  appId,
  onClose,
  disableAlerts,
  setActiveCaseFlowId,
}) => {
  const eventId = event?.ecs._id ?? '';
  const eventIndex = event?.ecs._index ?? '';
  const {
    onCaseClicked,
    goToCreateCase,
    onCaseSuccess,
    attachAlertToCase,
    createCaseUrl,
    isAllCaseModalOpen,
    isCreateCaseFlyoutOpen,
    activeCaseFlowId,
  } = useAddToCase({ event, useInsertTimeline, casePermissions, appId, onClose });
  const dispatch = useAppDispatch();
  const getAllCasesSelectorModalProps = useMemo(() => {
    const { ruleId, ruleName } = normalizedEventFields(event);
    return {
      alertData: {
        alertId: eventId,
        index: eventIndex ?? '',
        rule: {
          id: ruleId,
          name: ruleName,
        },
        owner: appId,
      },
      createCaseNavigation: {
        href: createCaseUrl,
        onClick: goToCreateCase,
      },
      hooks: {
        useInsertTimeline,
      },
      hiddenStatuses: [CaseStatuses.closed, StatusAll],
      onRowClick: onCaseClicked,
      updateCase: onCaseSuccess,
      userCanCrud: casePermissions?.crud ?? false,
      owner: [appId],
      onClose: () => dispatch(setOpenAddToExistingCase(null)),
    };
  }, [
    casePermissions?.crud,
    onCaseSuccess,
    onCaseClicked,
    createCaseUrl,
    goToCreateCase,
    eventId,
    eventIndex,
    appId,
    dispatch,
    useInsertTimeline,
    event,
  ]);

  const closeCaseFlyoutOpen = useCallback(() => {
    dispatch(setOpenAddToNewCase(null));
  }, [dispatch]);
  useEffect(() => {
    if (setActiveCaseFlowId) {
      setActiveCaseFlowId(activeCaseFlowId);
    }
  }, [activeCaseFlowId, setActiveCaseFlowId]);
  return (
    <>
      {isCreateCaseFlyoutOpen && (
        <CreateCaseFlyout
          afterCaseCreated={attachAlertToCase}
          onCloseFlyout={closeCaseFlyoutOpen}
          onSuccess={onCaseSuccess}
          useInsertTimeline={useInsertTimeline}
          appId={appId}
          disableAlerts={disableAlerts}
        />
      )}
      {isAllCaseModalOpen && <AllCasesSelectorModal {...getAllCasesSelectorModalProps} />}
    </>
  );
};

export const AddToCaseAction = memo(AddToCaseActionComponent);

// eslint-disable-next-line import/no-default-export
export default AddToCaseAction;
