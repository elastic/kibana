/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore typings for EuiBadge not present in current version
  EuiBadge,
  EuiFlexItem,
} from '@elastic/eui';

import React from 'react';
import { BeatTag, CMBeat, CMPopulatedBeat } from '../../../common/domain_types';
import { BeatsTagAssignment } from '../../../server/lib/adapters/beats/adapter_types';
import { BeatsTableType, Table } from '../../components/table';
import { FrontendLibs } from '../../lib/lib';
import { BeatsActionArea } from './beats_action_area';

interface BeatsPageProps {
  libs: FrontendLibs;
  location: any;
}

interface BeatsPageState {
  beats: CMBeat[];
  tags: any[] | null;
  tableRef: any;
}

export class BeatsPage extends React.PureComponent<BeatsPageProps, BeatsPageState> {
  public static ActionArea = BeatsActionArea;
  constructor(props: BeatsPageProps) {
    super(props);

    this.state = {
      beats: [],
      tableRef: React.createRef(),
      tags: null,
    };

    this.loadBeats();
  }
  public componentDidUpdate(prevProps: any) {
    if (this.props.location !== prevProps.location) {
      this.loadBeats();
    }
  }
  public render() {
    return (
      <Table
        actionHandler={this.handleBeatsActions}
        assignmentOptions={this.state.tags}
        assignmentTitle="Set tags"
        items={this.state.beats || []}
        ref={this.state.tableRef}
        type={BeatsTableType}
      />
    );
  }

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

  // TODO: call delete endpoint
  private deleteSelected = async () => {
    // const selected = this.getSelectedBeats();
    // await this.props.libs.beats.delete(selected);
  };

  private async loadBeats() {
    const beats = await this.props.libs.beats.getAll();
    this.setState({
      beats,
    });
  }

  // todo: add reference to ES filter endpoint
  private handleSearchQuery = (query: any) => {
    // await this.props.libs.beats.searach(query);
  };

  private loadTags = async () => {
    const tags = await this.props.libs.tags.getAll();
    const selectedBeats = this.getSelectedBeats();

    const renderedTags = tags.map((tag: BeatTag) => {
      const hasMatches = selectedBeats.some((beat: any) =>
        beat.full_tags.some((t: any) => t.id === tag.id)
      );

      return (
        <EuiFlexItem key={tag.id}>
          <EuiBadge
            color={tag.color}
            iconType={hasMatches ? 'cross' : null}
            onClick={
              hasMatches
                ? () => this.removeTagsFromBeats(selectedBeats, tag)
                : () => this.assignTagsToBeats(selectedBeats, tag)
            }
            onClickAriaLabel={tag.id}
          >
            {tag.id}
          </EuiBadge>
        </EuiFlexItem>
      );
    });
    this.setState({
      tags: renderedTags,
    });
  };

  private createBeatTagAssignments = (
    beats: CMPopulatedBeat[],
    tag: BeatTag
  ): BeatsTagAssignment[] => beats.map(({ id }) => ({ beatId: id, tag: tag.id }));

  private removeTagsFromBeats = async (beats: CMPopulatedBeat[], tag: BeatTag) => {
    await this.props.libs.beats.removeTagsFromBeats(this.createBeatTagAssignments(beats, tag));
    this.loadBeats();
  };

  private assignTagsToBeats = async (beats: CMPopulatedBeat[], tag: BeatTag) => {
    await this.props.libs.beats.assignTagsToBeats(this.createBeatTagAssignments(beats, tag));
    this.loadBeats();
  };

  private getSelectedBeats = () => {
    return this.state.tableRef.current.state.selection;
  };
}
