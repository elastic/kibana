/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiToolTip, EuiTourStep, EuiCode, EuiText, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getTimelineStatusByIdSelector } from '../../flyout/header/selectors';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineStatus } from '../../../../../common/api/timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useIsElementMounted } from '../../../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/use_is_element_mounted';
import { useLocalStorage } from '../../../../common/components/local_storage';
import { SaveTimelineModal } from './save_timeline_modal';
import * as timelineTranslations from './translations';

export interface SaveTimelineButtonProps {
  timelineId: string;
}

const SAVE_BUTTON_ELEMENT_ID = 'SAVE_BUTTON_ELEMENT_ID';
const LOCAL_STORAGE_KEY = 'security.timelineFlyoutHeader.saveTimelineTourSeen';

export const SaveTimelineButton = React.memo<SaveTimelineButtonProps>(({ timelineId }) => {
  const {
    services: {
      configSettings: { disableTimelineSaveTour },
    },
  } = useKibana();
  const [showEditTimelineOverlay, setShowEditTimelineOverlay] = useState<boolean>(false);

  const closeSaveTimeline = useCallback(() => {
    setShowEditTimelineOverlay(false);
  }, []);

  const openEditTimeline = useCallback(() => {
    setShowEditTimelineOverlay(true);
  }, []);

  // Case: 1
  // check if user has crud privileges so that user can be allowed to edit the timeline
  // Case: 2
  // TODO: User may have Crud privileges but they may not have access to timeline index.
  // Do we need to check that?
  const {
    kibanaSecuritySolutionsPrivileges: { crud: canEditTimeline },
  } = useUserPrivileges();
  const getTimelineStatus = useMemo(() => getTimelineStatusByIdSelector(), []);
  const {
    status: timelineStatus,
    isSaving,
    isLoading,
    show: isVisible,
  } = useDeepEqualSelector((state) => getTimelineStatus(state, timelineId));

  const isSaveButtonMounted = useIsElementMounted(SAVE_BUTTON_ELEMENT_ID);
  const [hasSeenTimelineSaveTour, setHasSeenTimelineSaveTour] = useLocalStorage({
    defaultValue: false,
    key: LOCAL_STORAGE_KEY,
  });
  // Why are we checking for so many flags here?
  // The tour popup should only show when timeline is fully populated and all necessary
  // elements are visible on screen. If we would not check for all these flags, the tour
  // popup would show too early and in the wrong place in the DOM.
  // The last flag, checks if the tour has been dismissed before.
  const showTimelineSaveTour =
    // The timeline save tour could be disabled on a plugin level
    !disableTimelineSaveTour &&
    canEditTimeline &&
    isVisible &&
    !isLoading &&
    isSaveButtonMounted &&
    !hasSeenTimelineSaveTour;

  const markTimelineSaveTourAsSeen = useCallback(() => {
    setHasSeenTimelineSaveTour(true);
  }, [setHasSeenTimelineSaveTour]);

  const isUnsaved = timelineStatus === TimelineStatus.draft;
  const tooltipContent = canEditTimeline ? null : timelineTranslations.CALL_OUT_UNAUTHORIZED_MSG;

  return (
    <EuiToolTip
      content={tooltipContent}
      position="bottom"
      data-test-subj="save-timeline-btn-tooltip"
    >
      <>
        <EuiButton
          fill
          color="primary"
          onClick={openEditTimeline}
          iconType="save"
          isLoading={isSaving}
          disabled={!canEditTimeline}
          data-test-subj="save-timeline-btn"
          id={SAVE_BUTTON_ELEMENT_ID}
        >
          {timelineTranslations.SAVE}
        </EuiButton>
        {showEditTimelineOverlay && canEditTimeline ? (
          <SaveTimelineModal
            closeSaveTimeline={closeSaveTimeline}
            initialFocusOn={isUnsaved ? 'title' : 'save'}
            timelineId={timelineId}
            showWarning={false}
          />
        ) : null}
        {showTimelineSaveTour && (
          <EuiTourStep
            anchor={`#${SAVE_BUTTON_ELEMENT_ID}`}
            content={
              <EuiText>
                <FormattedMessage
                  id="xpack.securitySolution.timeline.flyout.saveTour.description"
                  defaultMessage="Click {saveButton} to manually save changes."
                  values={{
                    saveButton: <EuiCode>{timelineTranslations.SAVE}</EuiCode>,
                  }}
                />
              </EuiText>
            }
            isStepOpen={true}
            minWidth={300}
            step={1}
            stepsTotal={1}
            onFinish={markTimelineSaveTourAsSeen}
            footerAction={
              <EuiButtonEmpty
                onClick={markTimelineSaveTourAsSeen}
                data-test-subj="timeline-save-tour-close-button"
              >
                {timelineTranslations.SAVE_TOUR_CLOSE}
              </EuiButtonEmpty>
            }
            title={timelineTranslations.SAVE_TOUR_TITLE}
            anchorPosition="downCenter"
          />
        )}
      </>
    </EuiToolTip>
  );
});

SaveTimelineButton.displayName = 'SaveTimelineButton';
