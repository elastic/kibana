/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiGlobalToastList,
  EuiIconTip,
  EuiLink,
} from '@elastic/eui';
import { sortBy } from 'lodash';
import moment from 'moment';
import React from 'react';
import { BeatTag, CMBeat, CMPopulatedBeat } from '../../../common/domain_types';
import { BeatsTagAssignment } from '../../../server/lib/adapters/beats/adapter_types';
import { AssignmentOptionSearch, Table, TagsTableType } from '../../components/table';
import { FrontendLibs } from '../../lib/lib';

interface TagsPageProps {
  libs: FrontendLibs;
}

interface TagsPageState {
  beats: any;
  assignmentOptions: AssignmentOptionSearch;
  notifications: any[];
  tags: BeatTag[];
}

export class TagsPage extends React.PureComponent<TagsPageProps, TagsPageState> {
  public static ActionArea = ({ history }: any) => (
    <EuiButton
      size="s"
      color="primary"
      onClick={async () => {
        history.push(`/tag/create`);
      }}
    >
      Add Tag
    </EuiButton>
  );
  private tableRef = React.createRef<Table>();

  constructor(props: TagsPageProps) {
    super(props);

    this.state = {
      assignmentOptions: {
        actionHandler: this.handleTagsAction,
        columnDefinitions: [
          {
            field: 'id',
            name: 'Beat',
          },
          {
            field: 'full_tags',
            name: 'Tags',
            render: (tags: BeatTag[]) => (
              <EuiFlexGroup gutterSize="xs">
                {sortBy(tags, 'id').map(({ color, id }) => (
                  <EuiFlexItem key={id} grow={false}>
                    <EuiIconTip
                      size="s"
                      color={color}
                      // @ts-ignore content prop is not defined on EuiIconTip type
                      content={id}
                      aria-label={id}
                      type="stopFilled"
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ),
          },
          {
            field: 'id',
            name: 'Assign',
            render: (id: string, beat: CMPopulatedBeat) => (
              <EuiLink
                onClick={async () => {
                  await this.handleTagAssignment(beat);
                  const updatedBeat = await this.props.libs.beats.get(id);
                  this.setState({
                    assignmentOptions: {
                      ...this.state.assignmentOptions,
                      searchResults: [updatedBeat],
                    },
                  });
                }}
              >
                Assign
              </EuiLink>
            ),
          },
        ],
        searchBox: { placeholder: 'Search for beat', incremental: false },
        searchResults: [],
        title: 'Assign Beat To Tags',
        type: 'search',
      },
      beats: [],
      notifications: [],
      tags: [],
    };

    this.loadTags();
  }

  public render() {
    return (
      <div>
        <Table
          assignmentOptions={this.state.assignmentOptions}
          items={this.state.tags}
          ref={this.tableRef}
          type={TagsTableType}
        />
        <EuiGlobalToastList
          dismissToast={() => this.setState({ notifications: [] })}
          toasts={this.state.notifications}
          toastLifeTimeMs={5000}
        />
      </div>
    );
  }

  private handleTagAssignment = async (beat: CMBeat) => {
    const tagsToRemove: BeatTag[] = [];
    const tagsToAdd: BeatTag[] = [];
    const tags = beat.tags || [];
    this.getSelectedTags().forEach((tag: BeatTag) => {
      tags.some((tagId: string) => tagId === tag.id) ? tagsToRemove.push(tag) : tagsToAdd.push(tag);
    });
    const assign = this.assignTagsToBeats(beat, tagsToAdd);
    const remove = this.removeTagsFromBeats(beat, tagsToRemove);
    await assign;
    await remove;
    this.notifyBeatAssigned(beat.id);
  };

  private handleTagsAction = async (action: string, payload: any) => {
    switch (action) {
      case 'assignmentSearch':
        const beatId = payload.query.queryText;
        try {
          const beat = await this.props.libs.beats.get(beatId);
          this.setState({
            assignmentOptions: { ...this.state.assignmentOptions, searchResults: [beat] },
          });
        } catch (e) {
          this.setState({
            assignmentOptions: {
              ...this.state.assignmentOptions,
              searchFailureMessage: 'Beat not found.',
            },
          });
          this.notifyBeatNotFound(beatId);
        }
        break;
      case 'delete':
        const tags = this.getSelectedTags().map(tag => tag.id);
        const success = await this.props.libs.tags.delete(tags);
        if (!success) {
          alert(
            'Some of these tags might be assigned to beats. Please ensure tags being removed are not activly assigned'
          );
        } else {
          this.loadTags();
          if (this.tableRef && this.tableRef.current) {
            this.tableRef.current.resetSelection();
          }
        }
        break;
    }

    this.loadTags();
  };

  private async notifyBeatAssigned(beatId: string) {
    this.setState({
      notifications: [
        ...this.state.notifications,
        {
          color: 'success',
          iconType: 'check',
          id: `${beatId}_${moment.now()}`,
          text: `"${beatId}" assignment successful.`,
          title: 'Assignment Complete',
        },
      ],
    });
  }

  private async notifyBeatNotFound(failedBeatId: string) {
    this.setState({
      notifications: [
        ...this.state.notifications,
        {
          color: 'warning',
          iconType: 'alert',
          id: `${failedBeatId}_${moment.now()}`,
          text: `Could not locate beat with ID "${failedBeatId}".`,
          title: 'Beat Not Found',
        },
      ],
    });
  }

  private async loadTags() {
    const tags = await this.props.libs.tags.getAll();
    this.setState({
      tags,
    });
  }

  private createBeatTagAssignments = (beat: CMBeat, tags: BeatTag[]): BeatsTagAssignment[] =>
    tags.map(({ id }) => ({ tag: id, beatId: beat.id }));

  private removeTagsFromBeats = async (beat: CMBeat, tags: BeatTag[]): Promise<void> => {
    if (!tags.length) {
      return;
    }
    const assignments = this.createBeatTagAssignments(beat, tags);
    await this.props.libs.beats.removeTagsFromBeats(assignments);
  };

  private assignTagsToBeats = async (beat: CMBeat, tags: BeatTag[]): Promise<void> => {
    if (!tags.length) {
      return;
    }
    const assignments = this.createBeatTagAssignments(beat, tags);
    await this.props.libs.beats.assignTagsToBeats(assignments);
  };

  private getSelectedTags = () => {
    return this.tableRef.current ? this.tableRef.current.state.selection : [];
  };
}
