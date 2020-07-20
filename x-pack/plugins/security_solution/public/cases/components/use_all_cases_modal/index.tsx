/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useMemo } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { APP_ID } from '../../../../common/constants';
import { SecurityPageName } from '../../../app/types';
import { useKibana } from '../../../common/lib/kibana';
import { getCaseDetailsUrl, getCreateCaseUrl } from '../../../common/components/link_to';
import { State } from '../../../common/store';
import { setInsertTimeline } from '../../../timelines/store/timeline/actions';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { UNTITLED_TIMELINE } from '../../../timelines/components/timeline/properties/translations';

import { AllCasesModal } from './all_cases_modal';

export interface UseAllCasesModalProps {
  timelineId: string;
  graphEventId?: string;
  title?: string;
}

export interface UseAllCasesModalReturnedValues {
  modal: JSX.Element | null;
  showModal: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  onRowClick: (id?: string) => void;
}

export const useAllCasesModal = ({
  timelineId,
  graphEventId,
  title,
}: UseAllCasesModalProps): UseAllCasesModalReturnedValues => {
  const dispatch = useDispatch();
  const { navigateToApp } = useKibana().services.application;
  const timelineSavedObjectId = useSelector(
    (state: State) => timelineSelectors.selectTimeline(state, timelineId)?.savedObjectId ?? ''
  );

  const [showModal, setShowModal] = useState<boolean>(false);
  const onCloseModal = useCallback(() => setShowModal(false), []);
  const onOpenModal = useCallback(() => setShowModal(true), []);

  const onRowClick = useCallback(
    (id?: string) => {
      onCloseModal();

      navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
        path: id != null ? getCaseDetailsUrl({ id }) : getCreateCaseUrl(),
      }).then(() =>
        dispatch(
          setInsertTimeline({
            graphEventId,
            timelineId,
            timelineSavedObjectId,
            timelineTitle: title && title.length > 0 ? title : UNTITLED_TIMELINE,
          })
        )
      );
    },
    // dispatch causes unnecessary rerenders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timelineSavedObjectId, graphEventId, navigateToApp, onCloseModal, timelineId, title]
  );

  const Modal = useMemo(
    () => <AllCasesModal onCloseCaseModal={onCloseModal} onRowClick={onRowClick} />,
    [onCloseModal, onRowClick]
  );

  const state = useMemo(
    () => ({
      modal: showModal ? Modal : null,
      showModal,
      onCloseModal,
      onOpenModal,
      onRowClick,
    }),
    [showModal, onCloseModal, onOpenModal, onRowClick, Modal]
  );

  return state;
};
