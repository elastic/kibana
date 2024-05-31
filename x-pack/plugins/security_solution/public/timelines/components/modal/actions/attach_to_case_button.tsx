/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanel, EuiContextMenuItem, EuiPopover, EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { CaseUI } from '@kbn/cases-plugin/common';
import { UNTITLED_TIMELINE } from '../../timeline/properties/translations';
import { selectTimelineById } from '../../../store/selectors';
import type { State } from '../../../../common/store';
import { APP_ID, APP_UI_ID } from '../../../../../common/constants';
import { setInsertTimeline, showTimeline } from '../../../store/actions';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineId } from '../../../../../common/types/timeline';
import { TimelineStatus, TimelineType } from '../../../../../common/api/timeline';
import { getCreateCaseUrl, getCaseDetailsUrl } from '../../../../common/components/link_to';
import { SecurityPageName } from '../../../../app/types';
import * as i18n from './translations';

interface AttachToCaseButtonProps {
  /**
   * Id of the timeline to be displayed in the bottom bar and within the modal
   */
  timelineId: string;
}

/**
 * Button that opens a popover with options to attach the timeline to new or existing case
 */
export const AttachToCaseButton = React.memo<AttachToCaseButtonProps>(({ timelineId }) => {
  const dispatch = useDispatch();
  const {
    graphEventId,
    savedObjectId,
    status: timelineStatus,
    title: timelineTitle,
    timelineType,
  } = useSelector((state: State) => selectTimelineById(state, timelineId));

  const {
    cases,
    application: { navigateToApp },
  } = useKibana().services;
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);

  const [isPopoverOpen, setPopover] = useState(false);
  const [isCaseModalOpen, openCaseModal] = useState(false);

  const togglePopover = useCallback(() => setPopover((currentIsOpen) => !currentIsOpen), []);
  const closeCaseModal = useCallback(() => openCaseModal(false), [openCaseModal]);

  const onRowClick = useCallback(
    async (theCase?: CaseUI) => {
      closeCaseModal();
      await navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.case,
        path: theCase != null ? getCaseDetailsUrl({ id: theCase.id }) : getCreateCaseUrl(),
      });
      dispatch(
        setInsertTimeline({
          graphEventId,
          timelineId,
          timelineSavedObjectId: savedObjectId,
          timelineTitle,
        })
      );
    },
    [
      closeCaseModal,
      dispatch,
      graphEventId,
      navigateToApp,
      savedObjectId,
      timelineId,
      timelineTitle,
    ]
  );

  const attachToNewCase = useCallback(() => {
    togglePopover();

    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.case,
      path: getCreateCaseUrl(),
    }).then(() => {
      dispatch(
        setInsertTimeline({
          graphEventId,
          timelineId,
          timelineSavedObjectId: savedObjectId,
          timelineTitle: timelineTitle.length > 0 ? timelineTitle : UNTITLED_TIMELINE,
        })
      );
      dispatch(showTimeline({ id: TimelineId.active, show: false }));
    });
  }, [
    dispatch,
    graphEventId,
    navigateToApp,
    savedObjectId,
    timelineId,
    timelineTitle,
    togglePopover,
  ]);

  const attachToExistingCase = useCallback(() => {
    togglePopover();
    openCaseModal(true);
  }, [togglePopover, openCaseModal]);

  const button = useMemo(
    () => (
      <EuiButtonEmpty
        iconType="arrowDown"
        iconSide="right"
        disabled={timelineStatus === TimelineStatus.draft || timelineType !== TimelineType.default}
        data-test-subj="timeline-modal-attach-to-case-dropdown-button"
        onClick={togglePopover}
      >
        {i18n.ATTACH_TO_CASE}
      </EuiButtonEmpty>
    ),
    [togglePopover, timelineStatus, timelineType]
  );

  const items = useMemo(
    () => [
      <EuiContextMenuItem
        key="new-case"
        data-test-subj="timeline-modal-attach-timeline-to-new-case"
        onClick={attachToNewCase}
      >
        {i18n.ATTACH_TO_NEW_CASE}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="existing-case"
        data-test-subj="timeline-modal-attach-timeline-to-existing-case"
        onClick={attachToExistingCase}
      >
        {i18n.ATTACH_TO_EXISTING_CASE}
      </EuiContextMenuItem>,
    ],
    [attachToExistingCase, attachToNewCase]
  );

  return (
    <>
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={togglePopover}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
      {isCaseModalOpen &&
        cases.ui.getAllCasesSelectorModal({
          onRowClick,
          onClose: closeCaseModal,
          owner: [APP_ID],
          permissions: userCasesPermissions,
        })}
    </>
  );
});

AttachToCaseButton.displayName = 'AttachToCaseButton';
