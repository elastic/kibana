/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiIcon,
  EuiToolTip,
  EuiAvatar,
} from '@elastic/eui';
import { NewTimeline, Description, NotesButton, NewCase, ExistingCase } from './helpers';

import { disableTemplate } from '../../../../../common/constants';
import { TimelineStatusLiteral, TimelineTypeLiteral } from '../../../../../common/types/timeline';

import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import { useKibana } from '../../../../common/lib/kibana';
import { Note } from '../../../../common/lib/note';

import { AssociateNote } from '../../notes/helpers';
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

type UpdateDescription = ({ id, description }: { id: string; description: string }) => void;
export type UpdateNote = (note: Note) => void;

interface PropertiesRightComponentProps {
  associateNote: AssociateNote;
  description: string;
  getNotesByIds: (noteIds: string[]) => Note[];
  graphEventId?: string;
  isDataInTimeline: boolean;
  noteIds: string[];
  onButtonClick: () => void;
  onClosePopover: () => void;
  onCloseTimelineModal: () => void;
  onOpenCaseModal: () => void;
  onOpenTimelineModal: () => void;
  onToggleShowNotes: () => void;
  showActions: boolean;
  showDescription: boolean;
  showNotes: boolean;
  showNotesFromWidth: boolean;
  showTimelineModal: boolean;
  showUsersView: boolean;
  status: TimelineStatusLiteral;
  timelineId: string;
  title: string;
  timelineType: TimelineTypeLiteral;
  updateDescription: UpdateDescription;
  updateNote: UpdateNote;
  usersViewing: string[];
}

const PropertiesRightComponent: React.FC<PropertiesRightComponentProps> = ({
  associateNote,
  description,
  getNotesByIds,
  graphEventId,
  isDataInTimeline,
  noteIds,
  onButtonClick,
  onClosePopover,
  onCloseTimelineModal,
  onOpenCaseModal,
  onOpenTimelineModal,
  onToggleShowNotes,
  showActions,
  showDescription,
  showNotes,
  showNotesFromWidth,
  showTimelineModal,
  showUsersView,
  status,
  timelineType,
  timelineId,
  title,
  updateDescription,
  updateNote,
  usersViewing,
}) => {
  const uiCapabilities = useKibana().services.application.capabilities;
  const capabilitiesCanUserCRUD: boolean = !!uiCapabilities.siem.crud;
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
              {capabilitiesCanUserCRUD && (
                <EuiFlexItem grow={false}>
                  <NewTimeline
                    timelineId={timelineId}
                    title={i18n.NEW_TIMELINE}
                    closeGearMenu={onClosePopover}
                  />
                </EuiFlexItem>
              )}

              {/*
               * CreateTemplateTimelineBtn
               * Remove the comment here to enable CreateTemplateTimelineBtn
               */}
              {!disableTemplate && (
                <EuiFlexItem grow={false}>
                  <NewTemplateTimeline
                    closeGearMenu={onClosePopover}
                    timelineId={timelineId}
                    title={i18n.NEW_TEMPLATE_TIMELINE}
                  />
                </EuiFlexItem>
              )}

              <EuiFlexItem grow={false}>
                <OpenTimelineModalButton onClick={onOpenTimelineModal} />
              </EuiFlexItem>

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

              {showNotesFromWidth ? (
                <EuiFlexItem grow={false}>
                  <NotesButton
                    animate={true}
                    associateNote={associateNote}
                    getNotesByIds={getNotesByIds}
                    noteIds={noteIds}
                    showNotes={showNotes}
                    size="l"
                    status={status}
                    timelineType={timelineType}
                    text={i18n.NOTES}
                    toggleShowNotes={onToggleShowNotes}
                    toolTip={i18n.NOTES_TOOL_TIP}
                    updateNote={updateNote}
                  />
                </EuiFlexItem>
              ) : null}

              {showDescription ? (
                <EuiFlexItem grow={false}>
                  <DescriptionPopoverMenuContainer>
                    <Description
                      description={description}
                      timelineId={timelineId}
                      updateDescription={updateDescription}
                    />
                  </DescriptionPopoverMenuContainer>
                </EuiFlexItem>
              ) : null}
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
