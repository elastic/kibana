/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiGlobalToastList } from '@elastic/eui';
import { sortBy } from 'lodash';
import moment from 'moment';
import React from 'react';
import { BeatTag, CMPopulatedBeat } from '../../../common/domain_types';
import { BeatsTagAssignment } from '../../../server/lib/adapters/beats/adapter_types';
import { BeatsTableType, Table } from '../../components/table';
import { TagAssignment } from '../../components/tag';
import { FrontendLibs } from '../../lib/lib';
import { BeatsActionArea } from './beats_action_area';

interface BeatsPageProps {
  libs: FrontendLibs;
  location: any;
}

interface BeatsPageState {
  beats: CMPopulatedBeat[];
  notifications: any[];
  tableRef: any;
  tags: any[] | null;
}

export class BeatsPage extends React.PureComponent<BeatsPageProps, BeatsPageState> {
  public static ActionArea = BeatsActionArea;
  private mounted: boolean = false;
  constructor(props: BeatsPageProps) {
    super(props);

    this.state = {
      beats: [],
      notifications: [],
      tableRef: React.createRef(),
      tags: null,
    };
  }
  public componentDidMount() {
    this.mounted = true;
    this.loadBeats();
  }
  public componentWillUnmount() {
    this.mounted = false;
  }
  public componentDidUpdate(prevProps: any) {
    if (this.props.location !== prevProps.location) {
      this.loadBeats();
    }
  }
  public render() {
    return (
      <div>
        <Table
          actionHandler={this.handleBeatsActions}
          assignmentOptions={this.state.tags}
          assignmentTitle="Set tags"
          items={sortBy(this.state.beats, 'id') || []}
          ref={this.state.tableRef}
          showAssignmentOptions={true}
          renderAssignmentOptions={this.renderTagAssignment}
          type={BeatsTableType}
        />
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

    this.loadBeats();
  };

  private deleteSelected = async () => {
    const selected = this.getSelectedBeats();
    for (const beat of selected) {
      await this.props.libs.beats.update(beat.id, { active: false });
    }
    // because the compile code above has a very minor race condition, we wait,
    // the max race condition time is really 10ms but doing 100 to be safe
    setTimeout(async () => {
      await this.loadBeats();
    }, 100);
  };

  private async loadBeats() {
    const beats = await this.props.libs.beats.getAll();
    if (this.mounted) {
      this.setState({
        beats,
      });
    }
  }

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
    await this.loadBeats();
    this.state.tableRef.current.setSelection(this.getSelectedBeats());
  };

  private getSelectedBeats = (): CMPopulatedBeat[] => {
    const selectedIds = this.state.tableRef.current.state.selection.map((beat: any) => beat.id);
    const beats: CMPopulatedBeat[] = [];
    selectedIds.forEach((id: any) => {
      const beat: CMPopulatedBeat | undefined = this.state.beats.find(b => b.id === id);
      if (beat) {
        beats.push(beat);
      }
    });
    return beats;
  };
}
