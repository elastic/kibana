/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import { EuiButton, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { Case } from '@kbn/cases-plugin/common';
import { APP_ID, APP_UI_ID } from '../../../../../common/constants';
import { timelineSelectors } from '../../../store/timeline';
import { setInsertTimeline, showTimeline } from '../../../store/timeline/actions';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useGetUserCasesPermissions, useKibana } from '../../../../common/lib/kibana';
import { TimelineStatus, TimelineId, TimelineType } from '../../../../../common/types/timeline';
import { getCreateCaseUrl, getCaseDetailsUrl } from '../../../../common/components/link_to';
import { SecurityPageName } from '../../../../app/types';
import { timelineDefaults } from '../../../store/timeline/defaults';
import * as i18n from '../../timeline/properties/translations';

interface Props {
  timelineId: string;
}

const AddToCaseButtonComponent: React.FC<Props> = ({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const {
    cases,
    application: { navigateToApp },
  } = useKibana().services;
  const dispatch = useDispatch();
  const {
    graphEventId,
    savedObjectId,
    status: timelineStatus,
    title: timelineTitle,
    timelineType,
  } = useDeepEqualSelector((state) =>
    pick(
      ['graphEventId', 'savedObjectId', 'status', 'title', 'timelineType'],
      getTimeline(state, timelineId) ?? timelineDefaults
    )
  );
  const [isPopoverOpen, setPopover] = useState(false);
  const [isCaseModalOpen, openCaseModal] = useState(false);

  const onRowClick = useCallback(
    async (theCase?: Case) => {
      openCaseModal(false);
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
    [dispatch, graphEventId, navigateToApp, savedObjectId, timelineId, timelineTitle]
  );

  const userPermissions = useGetUserCasesPermissions();

  const handleButtonClick = useCallback(() => {
    setPopover((currentIsOpen) => !currentIsOpen);
  }, []);

  const handlePopoverClose = useCallback(() => setPopover(false), []);

  const handleNewCaseClick = useCallback(() => {
    handlePopoverClose();

    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.case,
      path: getCreateCaseUrl(),
    }).then(() => {
      dispatch(
        setInsertTimeline({
          graphEventId,
          timelineId,
          timelineSavedObjectId: savedObjectId,
          timelineTitle: timelineTitle.length > 0 ? timelineTitle : i18n.UNTITLED_TIMELINE,
        })
      );
      dispatch(showTimeline({ id: TimelineId.active, show: false }));
    });
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
    openCaseModal(true);
  }, [openCaseModal, handlePopoverClose]);

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
        disabled={timelineStatus === TimelineStatus.draft || timelineType !== TimelineType.default}
      >
        {i18n.ATTACH_TO_CASE}
      </EuiButton>
    ),
    [handleButtonClick, timelineStatus, timelineType]
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
      {isCaseModalOpen &&
        cases.ui.getAllCasesSelectorModal({
          onRowClick,
          userCanCrud: userPermissions?.crud ?? false,
          owner: [APP_ID],
        })}
    </>
  );
};

AddToCaseButtonComponent.displayName = 'AddToCaseButtonComponent';

export const AddToCaseButton = React.memo(AddToCaseButtonComponent);
