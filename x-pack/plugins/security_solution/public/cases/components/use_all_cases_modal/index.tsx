/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { APP_ID } from '../../../../common/constants';
import { SecurityPageName } from '../../../app/types';
import { useKibana } from '../../../common/lib/kibana';
import { getCaseDetailsUrl, getCreateCaseUrl } from '../../../common/components/link_to';
import { setInsertTimeline } from '../../../timelines/store/timeline/actions';
import { timelineSelectors } from '../../../timelines/store/timeline';

import { AllCasesModal } from './all_cases_modal';

export interface UseAllCasesModalProps {
  timelineId: string;
}

export interface UseAllCasesModalReturnedValues {
  Modal: React.FC;
  showModal: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  onRowClick: (id?: string) => void;
}

export const useAllCasesModal = ({
  timelineId,
}: UseAllCasesModalProps): UseAllCasesModalReturnedValues => {
  const dispatch = useDispatch();
  const { navigateToApp } = useKibana().services.application;
  const timeline = useShallowEqualSelector((state) =>
    timelineSelectors.selectTimeline(state, timelineId)
  );

  const [showModal, setShowModal] = useState<boolean>(false);
  const onCloseModal = useCallback(() => setShowModal(false), []);
  const onOpenModal = useCallback(() => setShowModal(true), []);

  const onRowClick = useCallback(
    async (id?: string) => {
      onCloseModal();

      await navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
        path: id != null ? getCaseDetailsUrl({ id }) : getCreateCaseUrl(),
      });

      dispatch(
        setInsertTimeline({
          graphEventId: timeline.graphEventId ?? '',
          timelineId,
          timelineSavedObjectId: timeline.savedObjectId ?? '',
          timelineTitle: timeline.title,
        })
      );
    },
    // dispatch causes unnecessary rerenders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeline, navigateToApp, onCloseModal, timelineId]
  );

  const Modal: React.FC = useCallback(
    () =>
      showModal ? <AllCasesModal onCloseCaseModal={onCloseModal} onRowClick={onRowClick} /> : null,
    [onCloseModal, onRowClick, showModal]
  );

  const state = useMemo(
    () => ({
      Modal,
      showModal,
      onCloseModal,
      onOpenModal,
      onRowClick,
    }),
    [showModal, onCloseModal, onOpenModal, onRowClick, Modal]
  );

  return state;
};
