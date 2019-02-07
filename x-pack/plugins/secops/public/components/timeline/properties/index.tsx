/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiForm, EuiFormRow, EuiIcon, EuiPopover } from '@elastic/eui';
import * as React from 'react';
import { injectGlobal } from 'styled-components';

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
  width: number;
}

interface State {
  showActions: boolean;
  showNotes: boolean;
}

const showDescriptionThreshold = 655;
const showNotesThreshold = 770;
const showHistoryThreshold = 910;
const showStreamLiveThreshold = 1040;

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
      width,
    } = this.props;

    return (
      <TimelineProperties data-test-subj="timeline-properties">
        <PropertiesLeft>
          <StarIcon
            isFavorite={isFavorite}
            timelineId={timelineId}
            updateIsFavorite={updateIsFavorite}
          />

          <Name timelineId={timelineId} title={title} updateTitle={updateTitle} />

          {width >= showDescriptionThreshold ? (
            <Description
              description={description}
              timelineId={timelineId}
              updateDescription={updateDescription}
            />
          ) : null}
        </PropertiesLeft>

        <PropertiesRight gutterSize="s" alignItems="center">
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
                toggleShowNotes={this.onToggleShowNotes.bind(this)}
                toolTip={i18n.NOTES_TOOL_TIP}
                updateNote={updateNote}
              />
            </EuiFlexItem>
          ) : null}

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
              button={<EuiIcon type="gear" size="l" onClick={this.onButtonClick.bind(this)} />}
              id="timelineSettingsPopover"
              isOpen={this.state.showActions}
              closePopover={this.onClosePopover.bind(this)}
            >
              <EuiForm>
                <EuiFormRow>
                  <NewTimeline
                    createTimeline={createTimeline}
                    onClosePopover={this.onClosePopover.bind(this)}
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

                {width < showNotesThreshold ? (
                  <EuiFormRow>
                    <NotesButton
                      animate={true}
                      associateNote={associateNote}
                      getNotesByIds={getNotesByIds}
                      noteIds={noteIds}
                      showNotes={this.state.showNotes}
                      size="l"
                      text={i18n.NOTES}
                      toggleShowNotes={this.onToggleShowNotes.bind(this)}
                      toolTip={i18n.NOTES_TOOL_TIP}
                      updateNote={updateNote}
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
        </PropertiesRight>
      </TimelineProperties>
    );
  }
}
