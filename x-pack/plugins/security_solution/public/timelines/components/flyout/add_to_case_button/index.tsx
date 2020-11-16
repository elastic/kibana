/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { APP_ID } from '../../../../../common/constants';
import { timelineSelectors } from '../../../../timelines/store/timeline';
import { useAllCasesModal } from '../../../../cases/components/use_all_cases_modal';
import { setInsertTimeline, showTimeline } from '../../../store/timeline/actions';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineStatus, TimelineId } from '../../../../../common/types/timeline';
import { getCreateCaseUrl } from '../../../../common/components/link_to';
import { SecurityPageName } from '../../../../app/types';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import * as i18n from '../../timeline/properties/translations';

interface Props {
  timelineId: string;
}

const AddToCaseButtonComponent: React.FC<Props> = ({ timelineId }) => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const { navigateToApp } = useKibana().services.application;
  const dispatch = useDispatch();
  const {
    graphEventId,
    savedObjectId,
    status: timelineStatus,
    title: timelineTitle,
  } = useDeepEqualSelector((state) => getTimeline(state, timelineId) ?? timelineDefaults);
  const [isPopoverOpen, setPopover] = useState(false);
  const { Modal: AllCasesModal, onOpenModal: onOpenCaseModal } = useAllCasesModal({ timelineId });

  const handleButtonClick = useCallback(() => {
    setPopover((currentIsOpen) => !currentIsOpen);
  }, []);

  const handlePopoverClose = useCallback(() => setPopover(false), []);

  const handleNewCaseClick = useCallback(() => {
    handlePopoverClose();

    dispatch(showTimeline({ id: TimelineId.active, show: false }));

    navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
      path: getCreateCaseUrl(),
    }).then(() =>
      dispatch(
        setInsertTimeline({
          graphEventId,
          timelineId,
          timelineSavedObjectId: savedObjectId,
          timelineTitle: timelineTitle.length > 0 ? timelineTitle : i18n.UNTITLED_TIMELINE,
        })
      )
    );
  }, [
    dispatch,
    graphEventId,
    navigateToApp,
    handlePopoverClose,
    savedObjectId,
    timelineId,
    timelineTitle,
  ]);

  const handleExistingCaseClick = useCallback(() => {
    handlePopoverClose();
    onOpenCaseModal();
  }, [onOpenCaseModal, handlePopoverClose]);

  const closePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const button = useMemo(
    () => (
      <EuiButton
        fill
        size="m"
        data-test-subj="attach-timeline-case-button"
        iconType="arrowDown"
        iconSide="right"
        onClick={handleButtonClick}
        disabled={timelineStatus === TimelineStatus.draft}
      >
        {i18n.ATTACH_TO_CASE}
      </EuiButton>
    ),
    [handleButtonClick, timelineStatus]
  );

  const items = useMemo(
    () => [
      <EuiContextMenuItem
        key="new-case"
        data-test-subj="attach-timeline-new-case"
        onClick={handleNewCaseClick}
      >
        {i18n.ATTACH_TO_NEW_CASE}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="existing-case"
        data-test-subj="attach-timeline-existing-case"
        onClick={handleExistingCaseClick}
      >
        {i18n.ATTACH_TO_EXISTING_CASE}
      </EuiContextMenuItem>,
    ],
    [handleExistingCaseClick, handleNewCaseClick]
  );

  return (
    <>
      <EuiPopover
        id="singlePanel"
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
      <AllCasesModal />
    </>
  );
};

AddToCaseButtonComponent.displayName = 'AddToCaseButtonComponent';

export const AddToCaseButton = React.memo(AddToCaseButtonComponent);
