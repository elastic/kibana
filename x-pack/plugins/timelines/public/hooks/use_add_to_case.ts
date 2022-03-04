/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get, isEmpty } from 'lodash/fp';
import { useState, useCallback, useMemo, SyntheticEvent } from 'react';
import { useDispatch } from 'react-redux';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { Case, CommentType } from '../../../cases/common';
import { TimelinesStartServices } from '../types';
import { TimelineItem } from '../../common/search_strategy';
import { tGridActions } from '../store/t_grid';
import { useDeepEqualSelector } from './use_selector';
import { createUpdateSuccessToaster } from '../components/actions/timeline/cases/helpers';
import { AddToCaseActionProps } from '../components/actions';
import { CaseAttachments, CasesDeepLinkId, generateCaseViewPath } from '../../../cases/public';

interface UseAddToCase {
  addNewCaseClick: () => void;
  addExistingCaseClick: () => void;
  onCaseClicked: (theCase?: Case) => void;
  onCaseSuccess: (theCase: Case) => Promise<void>;
  onCaseCreated: () => Promise<void>;
  isAllCaseModalOpen: boolean;
  isDisabled: boolean;
  userCanCrud: boolean;
  isEventSupported: boolean;
  openPopover: (event: SyntheticEvent<HTMLButtonElement, MouseEvent>) => void;
  closePopover: () => void;
  isPopoverOpen: boolean;
  isCreateCaseFlyoutOpen: boolean;
  caseAttachments?: CaseAttachments;
}

export const useAddToCase = ({
  event,
  casePermissions,
  appId,
  onClose,
  owner,
}: AddToCaseActionProps): UseAddToCase => {
  const eventId = event?.ecs._id ?? '';
  const dispatch = useDispatch();
  // TODO: use correct value in standalone or integrated.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timelineById = useDeepEqualSelector((state: any) => {
    if (state.timeline) {
      return state.timeline.timelineById[eventId];
    } else {
      return state.timelineById[eventId];
    }
  });
  const isAllCaseModalOpen = useMemo(() => {
    if (timelineById) {
      return timelineById.isAddToExistingCaseOpen;
    } else {
      return false;
    }
  }, [timelineById]);
  const isCreateCaseFlyoutOpen = useMemo(() => {
    if (timelineById) {
      return timelineById.isCreateNewCaseOpen;
    } else {
      return false;
    }
  }, [timelineById]);
  const {
    application: { navigateToApp },
    notifications: { toasts },
  } = useKibana<TimelinesStartServices>().services;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const openPopover = useCallback(() => setIsPopoverOpen(true), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const isEventSupported = useMemo(() => {
    if (event !== undefined) {
      if (event.data.some(({ field }) => field === 'kibana.alert.rule.uuid')) {
        return true;
      }
      return !isEmpty(event.ecs.signal?.rule?.id ?? event.ecs.kibana?.alert?.rule?.uuid);
    } else {
      return false;
    }
  }, [event]);

  const userCanCrud = casePermissions?.crud ?? false;
  const isDisabled = !userCanCrud || !isEventSupported;

  const onViewCaseClick = useCallback(
    (id) => {
      navigateToApp(appId, {
        deepLinkId: CasesDeepLinkId.cases,
        path: generateCaseViewPath({ detailName: id }),
      });
    },
    [navigateToApp, appId]
  );

  const onCaseCreated = useCallback(async () => {
    dispatch(tGridActions.setOpenAddToNewCase({ id: eventId, isOpen: false }));
  }, [eventId, dispatch]);

  const onCaseSuccess = useCallback(
    async (theCase: Case) => {
      dispatch(tGridActions.setOpenAddToExistingCase({ id: eventId, isOpen: false }));
      createUpdateSuccessToaster(toasts, theCase, onViewCaseClick);
    },
    [onViewCaseClick, toasts, dispatch, eventId]
  );
  const caseAttachments: CaseAttachments = useMemo(() => {
    const eventIndex = event?.ecs._index ?? '';
    const { ruleId, ruleName } = normalizedEventFields(event);
    const attachments = [
      {
        alertId: eventId,
        index: eventIndex ?? '',
        rule: {
          id: ruleId,
          name: ruleName,
        },
        owner,
        type: CommentType.alert as const,
      },
    ];
    return attachments;
  }, [event, eventId, owner]);

  const onCaseClicked = useCallback(
    (theCase?: Case) => {
      /**
       * No cases listed on the table.
       * The user pressed the add new case table's button.
       * We gonna open the create case modal.
       */
      if (theCase == null) {
        dispatch(tGridActions.setOpenAddToNewCase({ id: eventId, isOpen: true }));
      }
      dispatch(tGridActions.setOpenAddToExistingCase({ id: eventId, isOpen: false }));
    },
    [dispatch, eventId]
  );
  const addNewCaseClick = useCallback(() => {
    closePopover();
    dispatch(tGridActions.setOpenAddToNewCase({ id: eventId, isOpen: true }));
    if (onClose) {
      onClose();
    }
  }, [onClose, closePopover, dispatch, eventId]);

  const addExistingCaseClick = useCallback(() => {
    closePopover();
    dispatch(tGridActions.setOpenAddToExistingCase({ id: eventId, isOpen: true }));
    if (onClose) {
      onClose();
    }
  }, [onClose, closePopover, dispatch, eventId]);
  return {
    caseAttachments,
    addNewCaseClick,
    addExistingCaseClick,
    onCaseClicked,
    onCaseSuccess,
    onCaseCreated,
    isAllCaseModalOpen,
    isDisabled,
    userCanCrud,
    isEventSupported,
    openPopover,
    closePopover,
    isPopoverOpen,
    isCreateCaseFlyoutOpen,
  };
};

export function normalizedEventFields(event?: TimelineItem) {
  const ruleUuidData = event && event.data.find(({ field }) => field === ALERT_RULE_UUID);
  const ruleNameData = event && event.data.find(({ field }) => field === ALERT_RULE_NAME);
  const ruleUuidValueData = ruleUuidData && ruleUuidData.value && ruleUuidData.value[0];
  const ruleNameValueData = ruleNameData && ruleNameData.value && ruleNameData.value[0];

  const ruleUuid =
    ruleUuidValueData ??
    get(`ecs.${ALERT_RULE_UUID}[0]`, event) ??
    get(`ecs.signal.rule.id[0]`, event) ??
    null;
  const ruleName =
    ruleNameValueData ??
    get(`ecs.${ALERT_RULE_NAME}[0]`, event) ??
    get(`ecs.signal.rule.name[0]`, event) ??
    null;

  return {
    ruleId: ruleUuid,
    ruleName,
  };
}
