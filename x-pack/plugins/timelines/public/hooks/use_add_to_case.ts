/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';
import { useState, useCallback, useMemo, SyntheticEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { Case, SubCase } from '../../../cases/common';
import { TimelinesStartServices } from '../types';
import { tGridActions } from '../store/t_grid';
import { useDeepEqualSelector } from './use_selector';
import { createUpdateSuccessToaster } from '../components/actions/timeline/cases/helpers';
import { AddToCaseActionProps } from '../components/actions/timeline/cases/add_to_case_action';

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
  ecsRowData,
  useInsertTimeline,
  casePermissions,
  appId,
  onClose,
}: AddToCaseActionProps): UseAddToCase => {
  const eventId = ecsRowData._id;
  const eventIndex = ecsRowData._index;
  const rule = ecsRowData.signal?.rule;
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
    application: { navigateToApp, getUrlForApp },
    notifications: { toasts },
  } = useKibana<TimelinesStartServices>().services;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const openPopover = useCallback(() => setIsPopoverOpen(true), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const isEventSupported = !isEmpty(ecsRowData.signal?.rule?.id);
  const userCanCrud = casePermissions?.crud ?? false;
  const isDisabled = !userCanCrud || !isEventSupported;

  const onViewCaseClick = useCallback(
    (id) => {
      navigateToApp(appId, {
        deepLinkId: appId === 'securitySolution' ? 'case' : 'cases',
        path: getCaseDetailsUrl({ id }),
      });
    },
    [navigateToApp, appId]
  );
  const currentSearch = useLocation().search;
  const urlSearch = useMemo(() => currentSearch, [currentSearch]);
  const createCaseUrl = useMemo(() => getUrlForApp('cases') + getCreateCaseUrl(urlSearch), [
    getUrlForApp,
    urlSearch,
  ]);

  const attachAlertToCase = useCallback(
    async (
      theCase: Case,
      postComment?: (arg: PostCommentArg) => Promise<void>,
      updateCase?: (newCase: Case) => void
    ) => {
      dispatch(tGridActions.setOpenAddToNewCase({ id: eventId, isOpen: false }));
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
    [eventId, eventIndex, rule, appId, dispatch]
  );
  const onCaseSuccess = useCallback(
    async (theCase: Case) => {
      dispatch(tGridActions.setOpenAddToExistingCase({ id: eventId, isOpen: false }));
      createUpdateSuccessToaster(toasts, theCase, onViewCaseClick);
    },
    [onViewCaseClick, toasts, dispatch, eventId]
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
  };
};
