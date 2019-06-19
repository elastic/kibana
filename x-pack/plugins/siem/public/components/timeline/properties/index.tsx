/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiAvatar,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import * as React from 'react';
import styled, { injectGlobal } from 'styled-components';

import { Note } from '../../../lib/note';
import { AssociateNote, UpdateNote } from '../../notes/helpers';
import { SuperDatePicker } from '../../super_date_picker';

import { Description, Name, NewTimeline, NotesButton, StarIcon } from './helpers';
import {
  DatePicker,
  PropertiesLeft,
  PropertiesRight,
  TimelineProperties,
  LockIconContainer,
} from './styles';
import * as i18n from './translations';
import { OpenTimelineModalButton } from '../../open_timeline/open_timeline_modal';
import { InputsModelId } from '../../../store/inputs/constants';

type CreateTimeline = ({ id, show }: { id: string; show?: boolean }) => void;
type UpdateIsFavorite = ({ id, isFavorite }: { id: string; isFavorite: boolean }) => void;
type UpdateTitle = ({ id, title }: { id: string; title: string }) => void;
type UpdateDescription = ({ id, description }: { id: string; description: string }) => void;
type ToggleLock = ({ linkToId }: { linkToId: InputsModelId }) => void;

// SIDE EFFECT: the following `injectGlobal` overrides `EuiPopover`
// and `EuiToolTip` global styles:
// eslint-disable-next-line no-unused-expressions
injectGlobal`
  .euiPopover__panel.euiPopover__panel-isOpen {
    z-index: 9900 !important;
  }
  .euiToolTip {
    z-index: 9950 !important;
  }
`;

const Avatar = styled(EuiAvatar)`
  margin-left: 5px;
`;

const DescriptionPopoverMenuContainer = styled.div`
  margin-top: 15px;
`;

const SettingsIcon = styled(EuiIcon)`
  margin-left: 4px;
  cursor: pointer;
`;

const HiddenFlexItem = styled(EuiFlexItem)`
  display: none;
`;

interface Props {
  associateNote: AssociateNote;
  createTimeline: CreateTimeline;
  isDatepickerLocked: boolean;
  isFavorite: boolean;
  title: string;
  description: string;
  getNotesByIds: (noteIds: string[]) => Note[];
  noteIds: string[];
  timelineId: string;
  toggleLock: ToggleLock;
  updateDescription: UpdateDescription;
  updateIsFavorite: UpdateIsFavorite;
  updateTitle: UpdateTitle;
  updateNote: UpdateNote;
  usersViewing: string[];
  width: number;
}

interface State {
  showActions: boolean;
  showNotes: boolean;
}

const rightGutter = 60; // px
export const datePickerThreshold = 600;
export const showNotesThreshold = 810;
export const showDescriptionThreshold = 970;

const starIconWidth = 30;
const nameWidth = 155;
const descriptionWidth = 165;
const noteWidth = 130;
const settingsWidth = 50;

/** Displays the properties of a timeline, i.e. name, description, notes, etc */
export class Properties extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      showActions: false,
      showNotes: false,
    };
  }

  public onButtonClick = () => {
    this.setState(prevState => ({
      showActions: !prevState.showActions,
    }));
  };

  public onToggleShowNotes = () => {
    this.setState(state => ({ showNotes: !state.showNotes }));
  };

  public onClosePopover = () => {
    this.setState({
      showActions: false,
    });
  };

  public render() {
    const {
      associateNote,
      createTimeline,
      description,
      getNotesByIds,
      isFavorite,
      isDatepickerLocked,
      title,
      noteIds,
      timelineId,
      updateDescription,
      updateIsFavorite,
      updateTitle,
      updateNote,
      usersViewing,
      width,
    } = this.props;

    const datePickerWidth =
      width -
      rightGutter -
      starIconWidth -
      nameWidth -
      (width >= showDescriptionThreshold ? descriptionWidth : 0) -
      noteWidth -
      settingsWidth;

    return (
      <TimelineProperties data-test-subj="timeline-properties" width={width}>
        <PropertiesLeft alignItems="center" data-test-subj="properties-left" gutterSize="s">
          <EuiFlexItem grow={false}>
            <StarIcon
              isFavorite={isFavorite}
              timelineId={timelineId}
              updateIsFavorite={updateIsFavorite}
            />
          </EuiFlexItem>

          <Name timelineId={timelineId} title={title} updateTitle={updateTitle} />

          {width >= showDescriptionThreshold ? (
            <EuiFlexItem grow={2}>
              <Description
                description={description}
                timelineId={timelineId}
                updateDescription={updateDescription}
              />
            </EuiFlexItem>
          ) : null}

          {width >= showNotesThreshold ? (
            <EuiFlexItem grow={false}>
              <NotesButton
                animate={true}
                associateNote={associateNote}
                getNotesByIds={getNotesByIds}
                noteIds={noteIds}
                showNotes={this.state.showNotes}
                size="l"
                text={i18n.NOTES}
                toggleShowNotes={this.onToggleShowNotes}
                toolTip={i18n.NOTES_TOOL_TIP}
                updateNote={updateNote}
              />
            </EuiFlexItem>
          ) : null}

          <EuiFlexItem grow={1}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="none"
              data-test-subj="timeline-date-picker-container"
            >
              <LockIconContainer grow={false}>
                <EuiToolTip
                  data-test-subj="timeline-date-picker-lock-tooltip"
                  position="top"
                  content={
                    isDatepickerLocked
                      ? i18n.LOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP
                      : i18n.UNLOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP
                  }
                >
                  <EuiButtonIcon
                    data-test-subj={`timeline-date-picker-${
                      isDatepickerLocked ? 'lock' : 'unlock'
                    }-button`}
                    color="primary"
                    onClick={this.toggleLock}
                    iconType={isDatepickerLocked ? 'lock' : 'lockOpen'}
                    aria-label={
                      isDatepickerLocked
                        ? i18n.UNLOCK_SYNC_MAIN_DATE_PICKER_ARIA
                        : i18n.LOCK_SYNC_MAIN_DATE_PICKER_ARIA
                    }
                  />
                </EuiToolTip>
              </LockIconContainer>
              <DatePicker
                grow={1}
                width={
                  datePickerWidth > datePickerThreshold ? datePickerThreshold : datePickerWidth
                }
              >
                <SuperDatePicker id="timeline" timelineId={timelineId} />
              </DatePicker>
            </EuiFlexGroup>
          </EuiFlexItem>
        </PropertiesLeft>

        <PropertiesRight alignItems="flexStart" data-test-subj="properties-right" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiPopover
              anchorPosition="downRight"
              button={
                <SettingsIcon
                  data-test-subj="settings-gear"
                  type="gear"
                  size="l"
                  onClick={this.onButtonClick}
                />
              }
              id="timelineSettingsPopover"
              isOpen={this.state.showActions}
              closePopover={this.onClosePopover}
            >
              <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <NewTimeline
                    createTimeline={createTimeline}
                    onClosePopover={this.onClosePopover}
                    timelineId={timelineId}
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <OpenTimelineModalButton />
                </EuiFlexItem>

                {width < showNotesThreshold ? (
                  <EuiFlexItem grow={false}>
                    <NotesButton
                      animate={true}
                      associateNote={associateNote}
                      getNotesByIds={getNotesByIds}
                      noteIds={noteIds}
                      showNotes={this.state.showNotes}
                      size="l"
                      text={i18n.NOTES}
                      toggleShowNotes={this.onToggleShowNotes}
                      toolTip={i18n.NOTES_TOOL_TIP}
                      updateNote={updateNote}
                    />
                  </EuiFlexItem>
                ) : null}

                {width < showDescriptionThreshold ? (
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
          </EuiFlexItem>

          {title != null && title.length
            ? usersViewing.map(user => (
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
        </PropertiesRight>
      </TimelineProperties>
    );
  }

  private toggleLock = () => {
    this.props.toggleLock({ linkToId: 'timeline' });
  };
}
