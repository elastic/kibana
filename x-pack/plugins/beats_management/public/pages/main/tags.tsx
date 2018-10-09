/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  // @ts-ignore EuiToolTip has no typings in current version
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import { BeatTag, CMBeat } from '../../../common/domain_types';
import { BeatsTagAssignment } from '../../../server/lib/adapters/beats/adapter_types';
import { AppURLState } from '../../app';
import { Table, TagsTableType } from '../../components/table';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';
import { URLStateProps } from '../../containers/with_url_state';
import { FrontendLibs } from '../../lib/lib';

interface TagsPageProps extends URLStateProps<AppURLState> {
  libs: FrontendLibs;
}

interface TagsPageState {
  beats: any;
  tags: BeatTag[];
}

export class TagsPage extends React.PureComponent<TagsPageProps, TagsPageState> {
  public static ActionArea = ({ goTo }: TagsPageProps) => (
    <EuiButton
      size="s"
      color="primary"
      onClick={async () => {
        goTo('/tag/create');
      }}
    >
      Add Tag
    </EuiButton>
  );
  private tableRef = React.createRef<Table>();

  constructor(props: TagsPageProps) {
    super(props);

    this.state = {
      beats: [],
      tags: [],
    };

    this.loadTags();
  }

  public render() {
    return (
      <WithKueryAutocompletion libs={this.props.libs} fieldPrefix="tag">
        {autocompleteProps => (
          <Table
            {...autocompleteProps}
            isKueryValid={this.props.libs.elasticsearch.isKueryValid(
              this.props.urlState.tagsKBar || ''
            )}
            kueryValue={this.props.urlState.tagsKBar}
            onKueryBarChange={(value: any) => this.props.setUrlState({ tagsKBar: value })}
            onKueryBarSubmit={() => null} // todo
            filterQueryDraft={'false'} // todo
            actionHandler={this.handleTagsAction}
            items={this.state.tags || []}
            renderAssignmentOptions={(item: any) => item}
            ref={this.tableRef}
            showAssignmentOptions={true}
            type={TagsTableType}
          />
        )}
      </WithKueryAutocompletion>
    );
  }

  private handleTagsAction = async (action: string, payload: any) => {
    switch (action) {
      case 'loadAssignmentOptions':
        this.loadBeats();
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
          <EuiToolTip
            content={<p>Last updated: {associatedTag ? associatedTag.last_updated : null}</p>}
            title={tagId}
          >
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
            {tagIcons.map((icon, index) => (
              <EuiFlexItem component="span" grow={false} key={icon.key || index}>
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
    return this.tableRef.current ? this.tableRef.current.state.selection : [];
  };
}
