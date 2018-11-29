/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'brace/mode/yaml';
import 'brace/theme/github';

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import * as euiVars from '@elastic/eui/dist/eui_theme_k6_light.json';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { sample } from 'lodash';
import React from 'react';
import { UNIQUENESS_ENFORCING_TYPES } from 'x-pack/plugins/beats_management/common/constants';
import { BeatTag, CMPopulatedBeat } from '../../../common/domain_types';
import { AppURLState } from '../../app';
import { PrimaryLayout } from '../../components/layouts/primary';
import { TagEdit } from '../../components/tag';
import { URLStateProps, withUrlState } from '../../containers/with_url_state';
import { FrontendLibs } from '../../lib/lib';
interface TagPageProps extends URLStateProps<AppURLState> {
  libs: FrontendLibs;
  match: any;
  intl: InjectedIntl;
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
    const randomColor = sample(
      Object.keys(euiVars)
        .filter(key => key.startsWith('euiColorVis'))
        .map(key => (euiVars as any)[key])
    );

    this.state = {
      showFlyout: false,
      attachedBeats: null,
      tag: {
        id: props.match.params.action === 'create' ? '' : props.match.params.tagid,
        color: this.rgb2hex(randomColor),
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
    const { intl } = this.props;

    return (
      <PrimaryLayout
        title={
          this.mode === 'create'
            ? intl.formatMessage({
                id: 'xpack.beatsManagement.tag.createTagTitle',
                defaultMessage: 'Create Tag',
              })
            : intl.formatMessage(
                {
                  id: 'xpack.beatsManagement.tag.updateTagTitle',
                  defaultMessage: 'Update Tag: {tagId}',
                },
                {
                  tagId: this.state.tag.id,
                }
              )
        }
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
                  this.state.tag.id.search(/^[a-zA-Z0-9-]+$/) === -1 ||
                  this.state.tag.id === '' ||
                  this.getNumExclusiveConfigurationBlocks() > 1 // || this.state.tag.configuration_blocks.length === 0
                }
                onClick={this.saveTag}
              >
                <FormattedMessage
                  id="xpack.beatsManagement.tag.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => this.props.goTo('/overview/tags')}>
                <FormattedMessage
                  id="xpack.beatsManagement.tag.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </PrimaryLayout>
    );
  }
  private rgb2hex(rgb: string) {
    const matchedrgb = rgb.match(
      /^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i
    );
    return matchedrgb && matchedrgb.length === 4
      ? '#' +
          ('0' + parseInt(matchedrgb[1], 10).toString(16)).slice(-2) +
          ('0' + parseInt(matchedrgb[2], 10).toString(16)).slice(-2) +
          ('0' + parseInt(matchedrgb[3], 10).toString(16)).slice(-2)
      : '';
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
  private getNumExclusiveConfigurationBlocks = () =>
    this.state.tag.configuration_blocks
      .map(({ type }) => UNIQUENESS_ENFORCING_TYPES.some(uniqueType => uniqueType === type))
      .reduce((acc, cur) => (cur ? acc + 1 : acc), 0);
}
export const TagPageUi = withUrlState<TagPageProps>(TagPageComponent);

export const TagPage = injectI18n(TagPageUi);
