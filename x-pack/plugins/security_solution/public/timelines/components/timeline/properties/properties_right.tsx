/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiIcon,
  EuiToolTip,
  EuiAvatar,
} from '@elastic/eui';
import { NewTimeline, NewCase, ExistingCase } from './helpers';

import {
  TimelineStatusLiteral,
  TimelineTypeLiteral,
  TimelineType,
} from '../../../../../common/types/timeline';
import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import { OpenTimelineModalButton } from '../../open_timeline/open_timeline_modal/open_timeline_modal_button';
import { OpenTimelineModal } from '../../open_timeline/open_timeline_modal';

import * as i18n from './translations';
import { NewTemplateTimeline } from './new_template_timeline';

export const PropertiesRightStyle = styled(EuiFlexGroup)`
  margin-right: 5px;
`;

PropertiesRightStyle.displayName = 'PropertiesRightStyle';

const DescriptionPopoverMenuContainer = styled.div`
  margin-top: 15px;
`;

DescriptionPopoverMenuContainer.displayName = 'DescriptionPopoverMenuContainer';

const SettingsIcon = styled(EuiIcon)`
  margin-left: 4px;
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

interface PropertiesRightComponentProps {
  graphEventId?: string;
  isDataInTimeline: boolean;
  onOpenCaseModal: () => void;
  showUsersView: boolean;
  status: TimelineStatusLiteral;
  timelineId: string;
  title: string;
  timelineType: TimelineTypeLiteral;
  usersViewing: string[];
}

const PropertiesRightComponent: React.FC<PropertiesRightComponentProps> = ({
  graphEventId,
  isDataInTimeline,
  onOpenCaseModal,
  showUsersView,
  status,
  timelineType,
  timelineId,
  title,
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
    <PropertiesRightStyle alignItems="flexStart" data-test-subj="properties-right" gutterSize="s">
      <EuiFlexItem grow={false}>
        <InspectButtonContainer>
          <EuiPopover
            anchorPosition="downRight"
            button={
              <SettingsIcon
                data-test-subj="settings-gear"
                type="gear"
                size="l"
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

              {timelineType === TimelineType.default && (
                <>
                  <EuiFlexItem grow={false}>
                    <NewCase
                      graphEventId={graphEventId}
                      onClosePopover={onClosePopover}
                      timelineId={timelineId}
                      timelineTitle={title}
                      timelineStatus={status}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <ExistingCase
                      onClosePopover={onClosePopover}
                      onOpenCaseModal={onOpenCaseModal}
                      timelineStatus={status}
                    />
                  </EuiFlexItem>
                </>
              )}

              <EuiFlexItem grow={false}>
                <InspectButton
                  queryId={timelineId}
                  inputId="timeline"
                  inspectIndex={0}
                  isDisabled={!isDataInTimeline}
                  onCloseInspect={onClosePopover}
                  title={i18n.INSPECT_TIMELINE_TITLE}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopover>
        </InspectButtonContainer>
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
    </PropertiesRightStyle>
  );
};

export const PropertiesRight = React.memo(PropertiesRightComponent);
