/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiAvatar,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import * as React from 'react';
import styled, { injectGlobal } from 'styled-components';

import { History } from '../../../lib/history';
import { Note } from '../../../lib/note';
import { AssociateNote, UpdateNote } from '../../notes/helpers';

import {
  Description,
  HistoryButton,
  Name,
  NewTimeline,
  NotesButton,
  StarIcon,
  StreamLive,
} from './helpers';
import { PropertiesLeft, PropertiesRight, TimelineProperties } from './styles';
import * as i18n from './translations';

type CreateTimeline = ({ id, show }: { id: string; show?: boolean }) => void;
type UpdateIsFavorite = ({ id, isFavorite }: { id: string; isFavorite: boolean }) => void;
type UpdateIsLive = ({ id, isLive }: { id: string; isLive: boolean }) => void;
type UpdateTitle = ({ id, title }: { id: string; title: string }) => void;
type UpdateDescription = ({ id, description }: { id: string; description: string }) => void;

// SIDE EFFECT: the following `injectGlobal` overrides `EuiPopover`
// and `EuiToolTip` global styles:
// tslint:disable-next-line:no-unused-expression
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

interface Props {
  associateNote: AssociateNote;
  createTimeline: CreateTimeline;
  isFavorite: boolean;
  isLive: boolean;
  title: string;
  description: string;
  getNotesByIds: (noteIds: string[]) => Note[];
  noteIds: string[];
  history: History[];
  timelineId: string;
  updateDescription: UpdateDescription;
  updateIsFavorite: UpdateIsFavorite;
  updateIsLive: UpdateIsLive;
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
export const showDescriptionThreshold = 610;
export const showHistoryThreshold = 760;
export const showStreamLiveThreshold = 900;

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
    this.setState({
      showActions: !this.state.showActions,
    });
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
      isLive,
      history,
      title,
      noteIds,
      timelineId,
      updateDescription,
      updateIsFavorite,
      updateIsLive,
      updateTitle,
      updateNote,
      usersViewing,
      width,
    } = this.props;

    return (
      <TimelineProperties data-test-subj="timeline-properties" width={width - rightGutter}>
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
            <EuiFlexItem grow={true}>
              <Description
                description={description}
                timelineId={timelineId}
                updateDescription={updateDescription}
              />
            </EuiFlexItem>
          ) : null}

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
        </PropertiesLeft>

        <PropertiesRight alignItems="center" data-test-subj="properties-right" gutterSize="s">
          {width >= showHistoryThreshold ? (
            <EuiFlexItem grow={false}>
              <HistoryButton history={history} />
            </EuiFlexItem>
          ) : null}

          {width >= showStreamLiveThreshold ? (
            <EuiFlexItem grow={false}>
              <StreamLive isLive={isLive} timelineId={timelineId} updateIsLive={updateIsLive} />
            </EuiFlexItem>
          ) : null}

          <EuiFlexItem grow={false}>
            <EuiPopover
              anchorPosition="downRight"
              button={
                <EuiIcon
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
              <EuiForm>
                <EuiFormRow>
                  <NewTimeline
                    createTimeline={createTimeline}
                    onClosePopover={this.onClosePopover}
                    timelineId={timelineId}
                  />
                </EuiFormRow>

                {width < showDescriptionThreshold ? (
                  <EuiFormRow label={i18n.DESCRIPTION}>
                    <Description
                      description={description}
                      timelineId={timelineId}
                      updateDescription={updateDescription}
                    />
                  </EuiFormRow>
                ) : null}

                {width < showHistoryThreshold ? (
                  <EuiFormRow>
                    <HistoryButton history={history} />
                  </EuiFormRow>
                ) : null}

                {width < showStreamLiveThreshold ? (
                  <EuiFormRow>
                    <StreamLive
                      isLive={isLive}
                      timelineId={timelineId}
                      updateIsLive={updateIsLive}
                    />
                  </EuiFormRow>
                ) : null}
              </EuiForm>
            </EuiPopover>
          </EuiFlexItem>

          {title != null && title.length
            ? usersViewing.map(user => (
                <EuiFlexItem key={user}>
                  <EuiToolTip
                    data-test-subj="timeline-action-pin-tool-tip"
                    content={`${user} ${i18n.IS_VIEWING}`}
                  >
                    <Avatar data-test-subj="avatar" size="s" name={user} />
                  </EuiToolTip>
                </EuiFlexItem>
              ))
            : null}
        </PropertiesRight>
      </TimelineProperties>
    );
  }
}
