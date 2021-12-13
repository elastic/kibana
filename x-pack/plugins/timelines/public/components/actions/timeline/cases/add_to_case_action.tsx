/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { CaseStatuses, StatusAll } from '../../../../../../cases/common';
import { TimelineItem } from '../../../../../common/search_strategy';
import { useAddToCase, normalizedEventFields } from '../../../../hooks/use_add_to_case';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { TimelinesStartServices } from '../../../../types';
import { setOpenAddToExistingCase, setOpenAddToNewCase } from '../../../../store/t_grid/actions';
import { CreateCaseFlyout } from './create/flyout';
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
  owner: string;
  onClose?: Function;
  disableAlerts?: boolean;
}

const AddToCaseActionComponent: React.FC<AddToCaseActionProps> = ({
  ariaLabel = i18n.ACTION_ADD_TO_CASE_ARIA_LABEL,
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
    goToCreateCase,
    onCaseSuccess,
    attachAlertToCase,
    createCaseUrl,
    isAllCaseModalOpen,
    isCreateCaseFlyoutOpen,
  } = useAddToCase({ event, useInsertTimeline, casePermissions, appId, owner, onClose });

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
        owner,
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
      owner: [owner],
      onClose: () => dispatch(setOpenAddToExistingCase({ id: eventId, isOpen: false })),
    };
  }, [
    casePermissions?.crud,
    onCaseSuccess,
    onCaseClicked,
    createCaseUrl,
    goToCreateCase,
    eventId,
    eventIndex,
    dispatch,
    owner,
    useInsertTimeline,
    event,
  ]);

  const closeCaseFlyoutOpen = useCallback(() => {
    dispatch(setOpenAddToNewCase({ id: eventId, isOpen: false }));
  }, [dispatch, eventId]);

  return (
    <>
      {isCreateCaseFlyoutOpen && (
        <CreateCaseFlyout
          afterCaseCreated={attachAlertToCase}
          onCloseFlyout={closeCaseFlyoutOpen}
          onSuccess={onCaseSuccess}
          useInsertTimeline={useInsertTimeline}
          owner={owner}
          disableAlerts={disableAlerts}
        />
      )}
      {isAllCaseModalOpen && cases.getAllCasesSelectorModal(getAllCasesSelectorModalProps)}
    </>
  );
};

export const AddToCaseAction = memo(AddToCaseActionComponent);

// eslint-disable-next-line import/no-default-export
export default AddToCaseAction;
