/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash/fp';
import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { APP_ID } from '../../../../common/constants';
import { SecurityPageName } from '../../../app/types';
import { useKibana } from '../../../common/lib/kibana';
import { getCaseDetailsUrl, getCreateCaseUrl } from '../../../common/components/link_to';
import { setInsertTimeline } from '../../../timelines/store/timeline/actions';
import { timelineSelectors } from '../../../timelines/store/timeline';

import { AllCasesModal } from './all_cases_modal';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

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
  const { graphEventId, savedObjectId, title } = useDeepEqualSelector((state) =>
    pick(
      ['graphEventId', 'savedObjectId', 'title'],
      timelineSelectors.selectTimeline(state, timelineId) ?? timelineDefaults
    )
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
          graphEventId,
          timelineId,
          timelineSavedObjectId: savedObjectId,
          timelineTitle: title,
        })
      );
    },
    [onCloseModal, navigateToApp, dispatch, graphEventId, timelineId, savedObjectId, title]
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
