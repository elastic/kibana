/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { OpenTimelineModalButton } from '../../open_timeline/open_timeline_modal/open_timeline_modal_button';
import { OpenTimelineModal } from '../../open_timeline/open_timeline_modal';
import type { ActionTimelineToShow } from '../../open_timeline/types';
import * as i18n from '../../timeline/properties/translations';
import { NewTimeline } from '../../timeline/properties/helpers';
import { NewTemplateTimeline } from '../../timeline/properties/new_template_timeline';

interface AddTimelineButtonComponentProps {
  timelineId: string;
}

export const ADD_TIMELINE_BUTTON_CLASS_NAME = 'add-timeline-button';

const actionTimelineToHide: ActionTimelineToShow[] = ['createFrom'];

const AddTimelineButtonComponent: React.FC<AddTimelineButtonComponentProps> = ({ timelineId }) => {
  const [showActions, setShowActions] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  const onButtonClick = useCallback(() => setShowActions(!showActions), [showActions]);
  const onClosePopover = useCallback(() => setShowActions(false), []);
  const onCloseTimelineModal = useCallback(() => setShowTimelineModal(false), []);
  const onOpenTimelineModal = useCallback(() => {
    onClosePopover();
    setShowTimelineModal(true);
  }, [onClosePopover]);

  const PopoverButtonIcon = useMemo(
    () => (
      <EuiButtonIcon
        className={ADD_TIMELINE_BUTTON_CLASS_NAME}
        data-test-subj="settings-plus-in-circle"
        iconType="plusInCircle"
        color="primary"
        size="m"
        onClick={onButtonClick}
        aria-label={i18n.ADD_TIMELINE}
      />
    ),
    [onButtonClick]
  );

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiPopover
          anchorPosition="downRight"
          button={PopoverButtonIcon}
          id="timelineSettingsPopover"
          panelProps={{
            'data-test-subj': 'timeline-addPopupPanel',
          }}
          isOpen={showActions}
          closePopover={onClosePopover}
          ownFocus
          repositionOnScroll
        >
          <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <NewTimeline
                timelineId={timelineId}
                title={i18n.NEW_TIMELINE}
                closeGearMenu={onClosePopover}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <NewTemplateTimeline
                closeGearMenu={onClosePopover}
                timelineId={timelineId}
                title={i18n.NEW_TEMPLATE_TIMELINE}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <OpenTimelineModalButton onClick={onOpenTimelineModal} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopover>
      </EuiFlexItem>

      {showTimelineModal ? (
        <OpenTimelineModal onClose={onCloseTimelineModal} hideActions={actionTimelineToHide} />
      ) : null}
    </>
  );
};

export const AddTimelineButton = React.memo(AddTimelineButtonComponent);
