/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import uuidv4 from 'uuid/v4';
import { BeatTag, ConfigurationBlock } from '../../../../common/domain_types';
import { TagEdit } from '../../../components/tag/tag_edit';
import { AppPageProps } from '../../../frontend_types';
interface PageState {
  tag: BeatTag;
  configuration_blocks: {
    error?: string | undefined;
    blocks: ConfigurationBlock[];
    page: number;
    total: number;
  };
}

export class InitialTagPage extends Component<AppPageProps, PageState> {
  constructor(props: AppPageProps) {
    super(props);
    this.state = {
      tag: {
        id: props.urlState.createdTag ? props.urlState.createdTag : uuidv4(),
        name: '',
        color: '#DD0A73',
        hasConfigurationBlocksTypes: [],
      },
      configuration_blocks: { blocks: [], page: 0, total: 0 },
    };

    if (props.urlState.createdTag) {
      this.loadTag();
    }
  }

  public async componentWillMount() {
    if (!this.props.urlState.createdTag) {
      await this.props.libs.tags.upsertTag(this.state.tag);
    }
    this.loadConfigBlocks();
  }

  public render() {
    return (
      <React.Fragment>
        <TagEdit
          tag={this.state.tag}
          configuration_blocks={this.state.configuration_blocks}
          onConfigListChange={(index: number, size: number) => {
            this.loadConfigBlocks(index);
          }}
          onTagChange={(field: string, value: string | number) =>
            this.setState(oldState => ({
              tag: { ...oldState.tag, [field]: value },
            }))
          }
          onConfigAddOrEdit={(block: ConfigurationBlock) => {
            this.props.libs.configBlocks
              .upsert({ ...block, tag: this.state.tag.id })
              .catch((e: any) => {
                // tslint:disable-next-line
                console.error('Error upseting config block', e);
              })
              .then(() => {
                this.loadConfigBlocks(this.state.configuration_blocks.page);
              });
          }}
          onConfigRemoved={(id: string) => {
            this.props.libs.configBlocks
              .delete(id)
              .catch((e: any) => {
                // tslint:disable-next-line
                console.error(`Error removing block ${id}`, e);
              })
              .then(() => {
                this.loadConfigBlocks(this.state.configuration_blocks.page);
              });
          }}
        />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              disabled={this.state.configuration_blocks.blocks.length === 0}
              onClick={this.saveTag}
            >
              <FormattedMessage
                id="xpack.beatsManagement.createTag.saveAndContinueButtonLabel"
                defaultMessage="Save & Continue"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </React.Fragment>
    );
  }

  private loadConfigBlocks = async (page: number = -1) => {
    const blocksResponse = await this.props.libs.configBlocks.getForTags([this.state.tag.id], page);

    if (blocksResponse.blocks.length > 0) {
      this.setState({
        configuration_blocks: blocksResponse,
      });
    }
  };

  private loadTag = async () => {
    const tags = await this.props.libs.tags.getTagsWithIds([this.state.tag.id]);
    if (tags.length > 0) {
      this.setState({
        tag: tags[0],
      });
    }
  };

  private saveTag = async () => {
    const newTag = await this.props.libs.tags.upsertTag(this.state.tag as BeatTag);
    if (!newTag) {
      return alert(
        i18n.translate('xpack.beatsManagement.createTag.errorSavingTagTitle', {
          defaultMessage: 'error saving tag',
        })
      );
    }
    this.props.setUrlState({
      createdTag: newTag.id,
    });
    this.props.goTo(`/walkthrough/initial/finish`);
  };
}
