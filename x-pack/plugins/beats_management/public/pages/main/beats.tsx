/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiGlobalToastList,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';
import { sortBy } from 'lodash';
import moment from 'moment';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import { BeatTag, CMPopulatedBeat } from '../../../common/domain_types';
import { BeatsTagAssignment } from '../../../server/lib/adapters/beats/adapter_types';
import { AppURLState } from '../../app';
import { BeatsTableType, Table } from '../../components/table';
import { TagAssignment } from '../../components/tag';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';
import { URLStateProps } from '../../containers/with_url_state';
import { FrontendLibs } from '../../lib/lib';
import { EnrollBeatPage } from './enroll_fragment';

interface BeatsPageProps extends URLStateProps<AppURLState> {
  libs: FrontendLibs;
  location: any;
  beats: CMPopulatedBeat[];
  loadBeats: () => any;
}

interface BeatsPageState {
  notifications: any[];
  tableRef: any;
  tags: any[] | null;
}

interface ActionAreaProps extends URLStateProps<AppURLState>, RouteComponentProps<any> {
  libs: FrontendLibs;
}

export class BeatsPage extends React.PureComponent<BeatsPageProps, BeatsPageState> {
  public static ActionArea = (props: ActionAreaProps) => (
    <React.Fragment>
      <EuiButtonEmpty
        onClick={() => {
          // random, but specific number ensures new tab does not overwrite another _newtab in chrome
          // and at the same time not truly random so that many clicks of the link open many tabs at this same URL
          window.open(
            'https://www.elastic.co/guide/en/beats/libbeat/current/getting-started.html',
            '_newtab35628937456'
          );
        }}
      >
        Learn how to install beats
      </EuiButtonEmpty>
      <EuiButton
        size="s"
        color="primary"
        onClick={async () => {
          props.goTo(`/overview/beats/enroll`);
        }}
      >
        Enroll Beats
      </EuiButton>

      {props.location.pathname === '/overview/beats/enroll' && (
        <EuiOverlayMask>
          <EuiModal
            onClose={() => {
              props.goTo(`/overview/beats`);
            }}
            style={{ width: '640px' }}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle>Enroll a new Beat</EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EnrollBeatPage {...props} />
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </React.Fragment>
  );
  constructor(props: BeatsPageProps) {
    super(props);

    this.state = {
      notifications: [],
      tableRef: React.createRef(),
      tags: null,
    };
  }

  public componentDidUpdate(prevProps: any) {
    if (this.props.location !== prevProps.location) {
      this.props.loadBeats();
    }
  }
  public render() {
    return (
      <div>
        <WithKueryAutocompletion libs={this.props.libs} fieldPrefix="beat">
          {autocompleteProps => (
            <Table
              {...autocompleteProps}
              isKueryValid={this.props.libs.elasticsearch.isKueryValid(
                this.props.urlState.beatsKBar || ''
              )} // todo check if query converts to es query correctly
              kueryValue={this.props.urlState.beatsKBar}
              onKueryBarChange={(value: any) => this.props.setUrlState({ beatsKBar: value })} // todo
              onKueryBarSubmit={() => null} // todo
              filterQueryDraft={'false'} // todo
              actionHandler={this.handleBeatsActions}
              assignmentOptions={this.state.tags}
              assignmentTitle="Set tags"
              items={sortBy(this.props.beats || [], 'id') || []}
              ref={this.state.tableRef}
              showAssignmentOptions={true}
              renderAssignmentOptions={this.renderTagAssignment}
              type={BeatsTableType}
            />
          )}
        </WithKueryAutocompletion>

        <EuiGlobalToastList
          toasts={this.state.notifications}
          dismissToast={() => this.setState({ notifications: [] })}
          toastLifeTimeMs={5000}
        />
      </div>
    );
  }

  private renderTagAssignment = (tag: BeatTag, key: string) => (
    <TagAssignment
      assignTagsToBeats={this.assignTagsToBeats}
      key={key}
      removeTagsFromBeats={this.removeTagsFromBeats}
      selectedBeats={this.getSelectedBeats()}
      tag={tag}
    />
  );

  private handleBeatsActions = (action: string, payload: any) => {
    switch (action) {
      case 'edit':
        // TODO: navigate to edit page
        break;
      case 'delete':
        this.deleteSelected();
        break;
      case 'search':
        this.handleSearchQuery(payload);
        break;
      case 'loadAssignmentOptions':
        this.loadTags();
        break;
    }

    this.props.loadBeats();
  };

  private deleteSelected = async () => {
    const selected = this.getSelectedBeats();
    for (const beat of selected) {
      await this.props.libs.beats.update(beat.id, { active: false });
    }
    // because the compile code above has a very minor race condition, we wait,
    // the max race condition time is really 10ms but doing 100 to be safe
    setTimeout(async () => {
      await this.props.loadBeats();
    }, 100);
  };

  // todo: add reference to ES filter endpoint
  private handleSearchQuery = (query: any) => {
    // await this.props.libs.beats.searach(query);
  };

  private loadTags = async () => {
    const tags = await this.props.libs.tags.getAll();
    this.setState({
      tags,
    });
  };

  private createBeatTagAssignments = (
    beats: CMPopulatedBeat[],
    tag: BeatTag
  ): BeatsTagAssignment[] => beats.map(({ id }) => ({ beatId: id, tag: tag.id }));

  private removeTagsFromBeats = async (beats: CMPopulatedBeat[], tag: BeatTag) => {
    const assignments = this.createBeatTagAssignments(beats, tag);
    await this.props.libs.beats.removeTagsFromBeats(assignments);
    await this.refreshData();
    this.notifyUpdatedTagAssociation('remove', assignments, tag.id);
  };

  private assignTagsToBeats = async (beats: CMPopulatedBeat[], tag: BeatTag) => {
    const assignments = this.createBeatTagAssignments(beats, tag);
    await this.props.libs.beats.assignTagsToBeats(assignments);
    await this.refreshData();
    this.notifyUpdatedTagAssociation('add', assignments, tag.id);
  };

  private notifyUpdatedTagAssociation = (
    action: 'add' | 'remove',
    assignments: BeatsTagAssignment[],
    tag: string
  ) => {
    const actionName = action === 'remove' ? 'Removed' : 'Added';
    const preposition = action === 'remove' ? 'from' : 'to';
    const beatMessage =
      assignments.length && assignments.length === 1
        ? `beat "${assignments[0].beatId}"`
        : `${assignments.length} beats`;
    this.setState({
      notifications: this.state.notifications.concat({
        color: 'success',
        id: `tag-${moment.now()}`,
        text: <p>{`${actionName} tag "${tag}" ${preposition} ${beatMessage}.`}</p>,
        title: `Tag ${actionName}`,
      }),
    });
  };

  private refreshData = async () => {
    await this.loadTags();
    await this.props.loadBeats();
    this.state.tableRef.current.setSelection(this.getSelectedBeats());
  };

  private getSelectedBeats = (): CMPopulatedBeat[] => {
    const selectedIds = this.state.tableRef.current.state.selection.map((beat: any) => beat.id);
    const beats: CMPopulatedBeat[] = [];
    selectedIds.forEach((id: any) => {
      const beat: CMPopulatedBeat | undefined = this.props.beats.find(b => b.id === id);
      if (beat) {
        beats.push(beat);
      }
    });
    return beats;
  };
}
