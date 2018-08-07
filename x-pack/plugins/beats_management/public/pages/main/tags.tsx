/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore EuiToolTip has no typings in current version
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { BeatTag, CMBeat } from '../../../common/domain_types';
import { BeatsTagAssignment } from '../../../server/lib/adapters/beats/adapter_types';
import { Table, TagsTableType } from '../../components/table';
import { FrontendLibs } from '../../lib/lib';

interface TagsPageProps {
  libs: FrontendLibs;
}

interface TagsPageState {
  beats: any;
  tableRef: any;
  tags: BeatTag[];
}

export class TagsPage extends React.PureComponent<TagsPageProps, TagsPageState> {
  constructor(props: TagsPageProps) {
    super(props);

    this.state = {
      beats: [],
      tableRef: React.createRef(),
      tags: [],
    };

    this.loadTags();
  }

  public render() {
    return (
      <Table
        actionHandler={this.handleTagsAction}
        assignmentOptions={this.state.beats}
        assignmentTitle={'Assign Beats'}
        items={this.state.tags}
        ref={this.state.tableRef}
        showAssignmentOptions={true}
        type={TagsTableType}
      />
    );
  }

  private handleTagsAction = (action: string, payload: any) => {
    switch (action) {
      case 'loadAssignmentOptions':
        this.loadBeats();
        break;
    }

    this.loadTags();
  };

  private async loadTags() {
    const tags = await this.props.libs.tags.getAll();
    this.setState({
      tags,
    });
  }

  private async loadBeats() {
    const beats = await this.props.libs.beats.getAll();
    const selectedTags = this.getSelectedTags();
    const renderedBeats = beats.map((beat: CMBeat) => {
      const tagsToRemove: BeatTag[] = [];
      const tagsToAdd: BeatTag[] = [];
      const tags = beat.tags || [];
      selectedTags.forEach((tag: BeatTag) => {
        tags.some((tagId: string) => tagId === tag.id)
          ? tagsToRemove.push(tag)
          : tagsToAdd.push(tag);
      });

      const tagIcons = tags.map((tagId: string) => {
        const associatedTag = this.state.tags.find(tag => tag.id === tagId);
        return (
          <EuiToolTip title={tagId}>
            <EuiIcon
              key={tagId}
              type="stopFilled"
              // @ts-ignore color typing does not allow for any string
              color={associatedTag.color || 'primary'}
            />
          </EuiToolTip>
        );
      });

      return (
        <EuiFlexItem key={beat.id}>
          <EuiFlexGroup alignItems="center" gutterSize="none">
            {tagIcons.map(icon => (
              <EuiFlexItem component="span" grow={false}>
                {icon}
              </EuiFlexItem>
            ))}
            <EuiFlexItem>
              <EuiButtonEmpty
                onClick={() => {
                  this.assignTagsToBeats(beat, tagsToAdd);
                  this.removeTagsFromBeats(beat, tagsToRemove);
                  this.loadBeats();
                }}
              >
                {beat.id}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      );
    });

    this.setState({
      beats: renderedBeats,
    });
  }

  private createBeatTagAssignments = (beat: CMBeat, tags: BeatTag[]): BeatsTagAssignment[] =>
    tags.map(({ id }) => ({ tag: id, beatId: beat.id }));

  private removeTagsFromBeats = async (beat: CMBeat, tags: BeatTag[]) => {
    const assignments = this.createBeatTagAssignments(beat, tags);
    await this.props.libs.beats.removeTagsFromBeats(assignments);
  };

  private assignTagsToBeats = async (beat: CMBeat, tags: BeatTag[]) => {
    const assignments = this.createBeatTagAssignments(beat, tags);
    await this.props.libs.beats.assignTagsToBeats(assignments);
  };

  private getSelectedTags = () => {
    return this.state.tableRef.current.state.selection;
  };
}
