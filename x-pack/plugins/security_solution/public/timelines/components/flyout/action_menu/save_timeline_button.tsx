/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiToolTip, EuiTourStep, EuiCode, EuiText, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineStatus } from '../../../../../common/api/timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useIsElementMounted } from '../../../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/use_is_element_mounted';
import { useLocalStorage } from '../../../../common/components/local_storage';

import { SaveTimelineModal } from './save_timeline_modal';
import * as timelineTranslations from './translations';
import { getTimelineStatusByIdSelector } from '../header/selectors';

export interface SaveTimelineButtonProps {
  timelineId: string;
}

const SAVE_BUTTON_ELEMENT_ID = 'SAVE_BUTTON_ELEMENT_ID';
const LOCAL_STORAGE_KEY = 'security.timelineFlyoutHeader.saveTimelineTour';

export const SaveTimelineButton = React.memo<SaveTimelineButtonProps>(({ timelineId }) => {
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
    kibanaSecuritySolutionsPrivileges: { crud: canEditTimelinePrivilege },
  } = useUserPrivileges();
  const getTimelineStatus = useMemo(() => getTimelineStatusByIdSelector(), []);
  const {
    status: timelineStatus,
    isSaving,
    isLoading,
    show: isVisible,
  } = useDeepEqualSelector((state) => getTimelineStatus(state, timelineId));

  const isSaveButtonMounted = useIsElementMounted(SAVE_BUTTON_ELEMENT_ID);
  const [timelineTourStatus, setTimelineTourStatus] = useLocalStorage({
    defaultValue: { isTourActive: true },
    key: LOCAL_STORAGE_KEY,
    isInvalidDefault: (valueFromStorage) => {
      return !valueFromStorage;
    },
  });

  const canEditTimeline = canEditTimelinePrivilege && timelineStatus !== TimelineStatus.immutable;
  // Why are we checking for so many flags here?
  // The tour popup should only show when timeline is fully populated and all necessary
  // elements are visible on screen. If we would not check for all these flags, the tour
  // popup would show too early and in the wrong place in the DOM.
  // The last flag, checks if the tour has been dismissed before.
  const showTimelineSaveTour =
    canEditTimeline &&
    isVisible &&
    !isLoading &&
    isSaveButtonMounted &&
    timelineTourStatus?.isTourActive;

  const markTimelineSaveTourAsSeen = useCallback(() => {
    setTimelineTourStatus({ isTourActive: false });
  }, [setTimelineTourStatus]);

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
          size="s"
          iconType="save"
          isLoading={isSaving}
          disabled={!canEditTimeline}
          data-test-subj="save-timeline-action-btn"
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
