/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiIcon,
  EuiToolTip,
  EuiAvatar,
} from '@elastic/eui';

import { OpenTimelineModalButton } from '../../open_timeline/open_timeline_modal/open_timeline_modal_button';
import { OpenTimelineModal } from '../../open_timeline/open_timeline_modal';

import * as i18n from '../../timeline/properties/translations';
import { NewTimeline } from '../../timeline/properties/helpers';
import { NewTemplateTimeline } from '../../timeline/properties/new_template_timeline';

const DescriptionPopoverMenuContainer = styled.div`
  margin-top: 15px;
`;

DescriptionPopoverMenuContainer.displayName = 'DescriptionPopoverMenuContainer';

const SettingsIcon = styled(EuiIcon)`
  cursor: pointer;
`;

SettingsIcon.displayName = 'SettingsIcon';

const HiddenFlexItem = styled(EuiFlexItem)`
  display: none;
`;

HiddenFlexItem.displayName = 'HiddenFlexItem';

const Avatar = styled(EuiAvatar)`
  margin-left: 5px;
`;

Avatar.displayName = 'Avatar';

interface AddTimelineButtonComponentProps {
  showUsersView: boolean;
  timelineId: string;
  usersViewing: string[];
}

const AddTimelineButtonComponent: React.FC<AddTimelineButtonComponentProps> = ({
  showUsersView,
  timelineId,
  usersViewing,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  const onButtonClick = useCallback(() => setShowActions(!showActions), [showActions]);
  const onClosePopover = useCallback(() => setShowActions(false), []);
  const onCloseTimelineModal = useCallback(() => setShowTimelineModal(false), []);
  const onOpenTimelineModal = useCallback(() => {
    onClosePopover();
    setShowTimelineModal(true);
  }, [onClosePopover]);

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiPopover
          anchorPosition="downRight"
          button={
            <EuiButtonIcon
              data-test-subj="settings-gear"
              iconType="plusInCircle"
              color="primary"
              size="m"
              onClick={onButtonClick}
            />
          }
          id="timelineSettingsPopover"
          isOpen={showActions}
          closePopover={onClosePopover}
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

      {showUsersView
        ? usersViewing.map((user) => (
            // Hide the hard-coded elastic user avatar as the 7.2 release does not implement
            // support for multi-user-collaboration as proposed in elastic/ingest-dev#395
            <HiddenFlexItem key={user}>
              <EuiToolTip
                data-test-subj="timeline-action-pin-tool-tip"
                content={`${user} ${i18n.IS_VIEWING}`}
              >
                <Avatar data-test-subj="avatar" size="s" name={user} />
              </EuiToolTip>
            </HiddenFlexItem>
          ))
        : null}

      {showTimelineModal ? <OpenTimelineModal onClose={onCloseTimelineModal} /> : null}
    </>
  );
};

export const AddTimelineButton = React.memo(AddTimelineButtonComponent);
