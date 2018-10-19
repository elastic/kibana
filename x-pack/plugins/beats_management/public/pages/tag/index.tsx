/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import 'brace/mode/yaml';

import 'brace/theme/github';
import React from 'react';
import { BeatTag, CMPopulatedBeat } from '../../../common/domain_types';
import { AppURLState } from '../../app';
import { PrimaryLayout } from '../../components/layouts/primary';
import { TagEdit } from '../../components/tag';
import { URLStateProps, withUrlState } from '../../containers/with_url_state';
import { FrontendLibs } from '../../lib/lib';

interface TagPageProps extends URLStateProps<AppURLState> {
  libs: FrontendLibs;
  match: any;
}

interface TagPageState {
  showFlyout: boolean;
  attachedBeats: CMPopulatedBeat[] | null;
  tag: BeatTag;
}

export class TagPageComponent extends React.PureComponent<TagPageProps, TagPageState> {
  private mode: 'edit' | 'create' = 'create';
  constructor(props: TagPageProps) {
    super(props);
    this.state = {
      showFlyout: false,
      attachedBeats: null,
      tag: {
        id: props.match.params.action === 'create' ? '' : props.match.params.tagid,
        color: '#DD0A73',
        configuration_blocks: [],
        last_updated: new Date(),
      },
    };

    if (props.match.params.action !== 'create') {
      this.mode = 'edit';
      this.loadTag();
      this.loadAttachedBeats();
    }
  }

  public render() {
    return (
      <PrimaryLayout
        title={this.mode === 'create' ? 'Create Tag' : `Update Tag: ${this.state.tag.id}`}
      >
        <div>
          <TagEdit
            tag={this.state.tag}
            mode={this.mode}
            onDetachBeat={async (beatIds: string[]) => {
              await this.props.libs.beats.removeTagsFromBeats(
                beatIds.map(id => {
                  return { beatId: id, tag: this.state.tag.id };
                })
              );
              await this.loadAttachedBeats();
            }}
            onTagChange={(field: string, value: string | number) =>
              this.setState(oldState => ({
                tag: { ...oldState.tag, [field]: value },
              }))
            }
            attachedBeats={this.state.attachedBeats}
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                disabled={
                  this.state.tag.id === '' // || this.state.tag.configuration_blocks.length === 0
                }
                onClick={this.saveTag}
              >
                Save
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => this.props.goTo('/overview/tags')}>
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </PrimaryLayout>
    );
  }
  private loadTag = async () => {
    const tags = await this.props.libs.tags.getTagsWithIds([this.props.match.params.tagid]);
    if (tags.length === 0) {
      // TODO do something to error
    }
    this.setState({
      tag: tags[0],
    });
  };

  private loadAttachedBeats = async () => {
    const beats = await this.props.libs.beats.getBeatsWithTag(this.props.match.params.tagid);

    this.setState({
      attachedBeats: beats,
    });
  };
  private saveTag = async () => {
    await this.props.libs.tags.upsertTag(this.state.tag as BeatTag);
    this.props.goTo(`/overview/tags`);
  };
}
export const TagPage = withUrlState<TagPageProps>(TagPageComponent);
