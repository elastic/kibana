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
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import 'brace/mode/yaml';
import 'brace/theme/github';
import React from 'react';
import { UNIQUENESS_ENFORCING_TYPES } from 'x-pack/plugins/beats_management/common/constants';
import { BeatTag, ConfigurationBlock } from '../../../common/domain_types';
import { PrimaryLayout } from '../../components/layouts/primary';
import { AssignmentActionType } from '../../components/table';
import { TagEdit } from '../../components/tag';
import { BeatsCMTable } from '../../connected_views/beats_table';
import { AppPageProps } from '../../frontend_types';
interface TagPageState {
  showFlyout: boolean;
  attachedBeats: {
    list: ConfigurationBlock[];
    page: number;
    total: number;
  };
  tag: BeatTag;
  beatsTags: BeatTag[];
  configuration_blocks: {
    error?: string | undefined;
    list: ConfigurationBlock[];
    page: number;
    total: number;
  };
}
class TagEditPageComponent extends React.PureComponent<
  AppPageProps & {
    intl: InjectedIntl;
  },
  TagPageState
> {
  constructor(props: AppPageProps & { intl: InjectedIntl }) {
    super(props);

    this.state = {
      showFlyout: false,
      attachedBeats: {
        list: [],
        page: 0,
        total: 0,
      },
      beatsTags: [],
      tag: {
        id: props.match.params.tagid,
        name: '',
        color: '#fff',
        hasConfigurationBlocksTypes: [],
      },
      configuration_blocks: {
        list: [],
        page: 0,
        total: 0,
      },
    };
  }

  public componentWillMount() {
    this.loadTag();
    this.loadConfigBlocks();
  }
  public render() {
    const { intl } = this.props;

    return (
      <PrimaryLayout
        hideBreadcrumbs={this.props.libs.framework.versionGreaterThen('6.7.0')}
        title={intl.formatMessage(
          {
            id: 'xpack.beatsManagement.tag.updateTagTitle',
            defaultMessage: 'Update Tag: {tagId}',
          },
          {
            tagId: this.state.tag.id,
          }
        )}
      >
        <div>
          <TagEdit
            tag={this.state.tag}
            configuration_blocks={this.state.configuration_blocks}
            onTagChange={(field: string, value: string | number) =>
              this.setState(oldState => ({
                tag: { ...oldState.tag, [field]: value },
              }))
            }
            onConfigListChange={(index: number) => {
              this.loadConfigBlocks(index);
            }}
            onConfigAddOrEdit={(block: ConfigurationBlock) => {
              this.props.libs.configBlocks
                .upsert([{ ...block, tag: this.state.tag.id }])
                .catch((e: any) => {
                  // tslint:disable-next-line
                  console.error('Error upseting config block', e);
                })
                .then(() => {
                  this.loadConfigBlocks(this.state.configuration_blocks.page);
                });
            }}
            onConfigRemoved={(block: ConfigurationBlock) => {
              this.props.libs.configBlocks
                .delete(block.id)
                .catch((e: any) => {
                  alert(
                    'Error removing block, please check your browsers console logs for more details'
                  );
                  // tslint:disable-next-line
                  console.error(`Error removing block ${block.id}`, e);
                })
                .then(() => {
                  this.loadConfigBlocks(this.state.configuration_blocks.page);
                });
            }}
          />
          <EuiSpacer />

          <EuiHorizontalRule />

          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.beatsManagement.tag.beatsAssignedToTagTitle"
                defaultMessage="Beats with this tag"
              />
            </h3>
          </EuiTitle>
          <BeatsCMTable
            forAttachedTag={this.state.tag.id}
            options={{
              page: this.props.urlState.attachedBeatsPage || 0,
              size: this.props.urlState.attachedBeatsSize || 25,
            }}
            onOptionsChange={newState => {
              this.props.setUrlState({
                attachedBeatsPage: newState.page.toString(),
                attachedBeatsSize: newState.size.toString(),
              });
            }}
            actionHandler={async (action: AssignmentActionType, payload: any) => {
              // Something
            }}
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                disabled={
                  this.state.tag.id.search(/^[A-Za-z0-9? ,_-]+$/) === -1 ||
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
              <EuiButtonEmpty onClick={() => this.props.goTo('/overview/configuration_tags')}>
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
  private loadConfigBlocks = async (page: number = -1) => {
    const blocksResponse = await this.props.libs.configBlocks.getForTags([this.state.tag.id], page);

    this.setState({
      configuration_blocks: blocksResponse as {
        error?: string | undefined;
        list: ConfigurationBlock[];
        page: number;
        total: number;
      },
    });
  };

  private loadTag = async () => {
    const tags = await this.props.libs.tags.getTagsWithIds([this.props.match.params.tagid]);
    if (tags.length === 0) {
      // TODO do something to error https://github.com/elastic/kibana/issues/26023
    }
    this.setState({
      tag: tags[0],
    });
  };

  private saveTag = async () => {
    await this.props.libs.tags.upsertTag(this.state.tag);
    this.props.goTo(`/overview/configuration_tags`);
  };
  private getNumExclusiveConfigurationBlocks = () =>
    this.state.configuration_blocks.list
      .map(({ type }) => UNIQUENESS_ENFORCING_TYPES.some(uniqueType => uniqueType === type))
      .reduce((acc, cur) => (cur ? acc + 1 : acc), 0);
}

export const TagEditPage = injectI18n(TagEditPageComponent);
