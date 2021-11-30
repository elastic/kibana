/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { CaseStatuses, StatusAll } from '../../../../../../cases/common';
import { TimelineItem } from '../../../../../common/';
import { useAddToCase, normalizedEventFields } from '../../../../hooks/use_add_to_case';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { TimelinesStartServices } from '../../../../types';
import { tGridActions } from '../../../../';

export interface AddToCaseActionProps {
  event?: TimelineItem;
  useInsertTimeline?: Function;
  casePermissions: {
    crud: boolean;
    read: boolean;
  } | null;
  appId: string;
  owner: string;
  onClose?: Function;
  disableAlerts?: boolean;
}

const AddToCaseActionComponent: React.FC<AddToCaseActionProps> = ({
  event,
  useInsertTimeline,
  casePermissions,
  appId,
  owner,
  onClose,
  disableAlerts,
}) => {
  const eventId = event?.ecs._id ?? '';
  const eventIndex = event?.ecs._index ?? '';
  const dispatch = useDispatch();
  const { cases } = useKibana<TimelinesStartServices>().services;
  const {
    onCaseClicked,
    onCaseSuccess,
    attachAlertToCase,
    isAllCaseModalOpen,
    isCreateCaseFlyoutOpen,
  } = useAddToCase({ event, casePermissions, appId, owner, onClose });

  const allCasesSelectorModalProps = useMemo(() => {
    const { ruleId, ruleName } = normalizedEventFields(event);
    return {
      alertData: {
        alertId: eventId,
        index: eventIndex ?? '',
        rule: {
          id: ruleId,
          name: ruleName,
        },
        owner,
      },
      hooks: {
        useInsertTimeline,
      },
      hiddenStatuses: [CaseStatuses.closed, StatusAll],
      onRowClick: onCaseClicked,
      updateCase: onCaseSuccess,
      userCanCrud: casePermissions?.crud ?? false,
      owner: [owner],
      onClose: () =>
        dispatch(tGridActions.setOpenAddToExistingCase({ id: eventId, isOpen: false })),
    };
  }, [
    casePermissions?.crud,
    onCaseSuccess,
    onCaseClicked,
    eventId,
    eventIndex,
    dispatch,
    owner,
    useInsertTimeline,
    event,
  ]);

  const closeCaseFlyoutOpen = useCallback(() => {
    dispatch(tGridActions.setOpenAddToNewCase({ id: eventId, isOpen: false }));
  }, [dispatch, eventId]);

  const createCaseFlyoutProps = useMemo(() => {
    return {
      afterCaseCreated: attachAlertToCase,
      onClose: closeCaseFlyoutOpen,
      onSuccess: onCaseSuccess,
      useInsertTimeline,
      owner: [owner],
      disableAlerts,
      userCanCrud: casePermissions?.crud ?? false,
    };
  }, [
    attachAlertToCase,
    closeCaseFlyoutOpen,
    onCaseSuccess,
    useInsertTimeline,
    owner,
    disableAlerts,
    casePermissions,
  ]);

  return (
    <>
      {isCreateCaseFlyoutOpen && cases.getCreateCaseFlyout(createCaseFlyoutProps)}
      {isAllCaseModalOpen && cases.getAllCasesSelectorModal(allCasesSelectorModalProps)}
    </>
  );
};

export const AddToCaseAction = memo(AddToCaseActionComponent);

// eslint-disable-next-line import/no-default-export
export default AddToCaseAction;
