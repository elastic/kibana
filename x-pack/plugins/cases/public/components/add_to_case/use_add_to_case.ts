/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get, isEmpty } from 'lodash/fp';
import { useState, useCallback, useMemo, SyntheticEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { Case, SubCase } from '../../../common';
import { TimelineItem } from '../../../common/';
import { createUpdateSuccessToaster } from './helpers';
import { useAppDispatch, useAppSelector } from '../utils';
import { setOpenAddToExistingCase, setOpenAddToNewCase } from '../../store/reducer';
import { activeCaseFlowId as activeCaseFlowIdSelector } from '../../store/selectors';
import { AddToCaseActionProps } from '.';
import type { StartServices } from '../../types';

interface UseAddToCase {
  addNewCaseClick: () => void;
  addExistingCaseClick: () => void;
  onCaseClicked: (theCase?: Case | SubCase) => void;
  goToCreateCase: (
    arg: MouseEvent | React.MouseEvent<Element, MouseEvent> | null
  ) => void | Promise<void>;
  onCaseSuccess: (theCase: Case) => Promise<void>;
  attachAlertToCase: (
    theCase: Case,
    postComment?: ((arg: PostCommentArg) => Promise<void>) | undefined,
    updateCase?: ((newCase: Case) => void) | undefined
  ) => Promise<void>;
  createCaseUrl: string;
  isAllCaseModalOpen: boolean;
  isDisabled: boolean;
  userCanCrud: boolean;
  isEventSupported: boolean;
  openPopover: (event: SyntheticEvent<HTMLButtonElement, MouseEvent>) => void;
  closePopover: () => void;
  isPopoverOpen: boolean;
  isCreateCaseFlyoutOpen: boolean;
  activeCaseFlowId: string | null;
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

export const useAddToCase = ({
  event,
  useInsertTimeline,
  casePermissions,
  appId,
  onClose,
}: AddToCaseActionProps): UseAddToCase => {
  const eventId = event?.ecs._id ?? '';
  const eventIndex = event?.ecs._index ?? '';
  const {
    application: { navigateToApp, getUrlForApp, navigateToUrl },
    notifications: { toasts },
  } = useKibana<StartServices>().services;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const dispatch = useAppDispatch();
  const openPopover = useCallback(() => setIsPopoverOpen(true), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const isAlert = useMemo(() => {
    if (event !== undefined) {
      const data = [...event.data];
      return data.some(({ field }) => field === 'kibana.alert.uuid');
    } else {
      return false;
    }
  }, [event]);
  const isSecurityAlert = useMemo(() => {
    return !isEmpty(event?.ecs.signal?.rule?.id);
  }, [event]);
  const isEventSupported = isSecurityAlert || isAlert;
  const userCanCrud = casePermissions?.crud ?? false;
  const isDisabled = !userCanCrud || !isEventSupported;

  const onViewCaseClick = useCallback(
    (id) => {
      const caseDetailsUrl = getCaseDetailsUrl({ id });
      const appUrl = getUrlForApp(appId);
      const fullCaseUrl = `${appUrl}/cases/${caseDetailsUrl}`;
      navigateToUrl(fullCaseUrl);
    },
    [navigateToUrl, appId, getUrlForApp]
  );
  const currentSearch = useLocation().search;
  const urlSearch = useMemo(() => currentSearch, [currentSearch]);
  const createCaseUrl = useMemo(
    () => getUrlForApp('cases') + getCreateCaseUrl(urlSearch),
    [getUrlForApp, urlSearch]
  );

  const attachAlertToCase = useCallback(
    async (
      theCase: Case,
      postComment?: (arg: PostCommentArg) => Promise<void>,
      updateCase?: (newCase: Case) => void
    ) => {
      dispatch(setOpenAddToNewCase(null));
      const { ruleId, ruleName } = normalizedEventFields(event);
      if (postComment) {
        await postComment({
          caseId: theCase.id,
          data: {
            type: 'alert',
            alertId: eventId,
            index: eventIndex ?? '',
            rule: {
              id: ruleId,
              name: ruleName,
            },
            owner: appId,
          },
          updateCase,
        });
      }
    },
    [eventId, eventIndex, appId, event, dispatch]
  );
  const onCaseSuccess = useCallback(
    async (theCase: Case) => {
      dispatch(setOpenAddToExistingCase(null));
      createUpdateSuccessToaster(toasts, theCase, onViewCaseClick);
    },
    [onViewCaseClick, toasts, dispatch]
  );

  const goToCreateCase = useCallback(
    async (ev) => {
      ev.preventDefault();
      return navigateToApp(appId, {
        deepLinkId: appId === 'securitySolution' ? 'case' : 'cases',
        path: getCreateCaseUrl(urlSearch),
      });
    },
    [navigateToApp, urlSearch, appId]
  );

  const onCaseClicked = useCallback(
    (theCase?: Case | SubCase) => {
      /**
       * No cases listed on the table.
       * The user pressed the add new case table's button.
       * We gonna open the create case modal.
       */
      if (theCase == null) {
        dispatch(setOpenAddToNewCase(eventId));
      }
      dispatch(setOpenAddToExistingCase(null));
    },
    [dispatch, eventId]
  );
  const addNewCaseClick = useCallback(() => {
    closePopover();
    dispatch(setOpenAddToNewCase(eventId));
    if (onClose) {
      onClose();
    }
  }, [onClose, closePopover, dispatch, eventId]);

  const addExistingCaseClick = useCallback(() => {
    closePopover();
    dispatch(setOpenAddToExistingCase(eventId));
    if (onClose) {
      onClose();
    }
  }, [onClose, closePopover, dispatch, eventId]);
  const isAllCaseModalOpen = useAppSelector(
    (state) => state.addToCase.addToExistingCaseOpenID === eventId
  );
  const isCreateCaseFlyoutOpen = useAppSelector(
    (state) => state.addToCase.createNewCaseOpenID === eventId
  );
  const activeCaseFlowId = useAppSelector(activeCaseFlowIdSelector);

  return {
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
    activeCaseFlowId,
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
