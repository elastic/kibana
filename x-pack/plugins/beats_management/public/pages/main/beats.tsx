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
  tableRef: any;
  tags: any[] | null;
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
        showAssignmentOptions={true}
        renderAssignmentOptions={(tag: BeatTag) => {
          const selectedBeats = this.getSelectedBeats();
          const hasMatches = selectedBeats.some((beat: any) =>
            (beat.tags || []).some((t: string) => t === tag.id)
          );

          return (
            <EuiFlexItem key={`${tag.id}-${hasMatches ? 'matched' : 'unmatched'}`}>
              <EuiBadge
                color={tag.color}
                iconType={hasMatches ? 'cross' : undefined}
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
        }}
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

    this.setState({
      tags,
    });
  };

  private createBeatTagAssignments = (
    beats: CMPopulatedBeat[],
    tag: BeatTag
  ): BeatsTagAssignment[] => beats.map(({ id }) => ({ beatId: id, tag: tag.id }));

  private removeTagsFromBeats = async (beats: CMPopulatedBeat[], tag: BeatTag) => {
    await this.props.libs.beats.removeTagsFromBeats(this.createBeatTagAssignments(beats, tag));
    await this.loadBeats();
    await this.loadTags();
  };

  private assignTagsToBeats = async (beats: CMPopulatedBeat[], tag: BeatTag) => {
    await this.props.libs.beats.assignTagsToBeats(this.createBeatTagAssignments(beats, tag));
    await this.loadBeats();
    await this.loadTags();
  };

  private getSelectedBeats = (): CMPopulatedBeat[] => {
    return this.state.tableRef.current.state.selection;
  };
}
