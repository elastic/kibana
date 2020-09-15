/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { isEqual } from 'lodash';
import React, { Component } from 'react';
import uuidv4 from 'uuid/v4';
import { BeatTag, ConfigurationBlock } from '../../../../common/domain_types';
import { TagEdit } from '../../../components/tag/tag_edit';
import { AppPageProps } from '../../../frontend_types';
interface PageState {
  tag: BeatTag;
  configuration_blocks: ConfigurationBlock[];
  currentConfigPage: number;
}

export class InitialTagPage extends Component<AppPageProps, PageState> {
  constructor(props: AppPageProps) {
    super(props);
    this.state = {
      tag: {
        id: uuidv4(),
        name: '',
        color: '#DD0A73',
        hasConfigurationBlocksTypes: [],
      },
      configuration_blocks: [],
      currentConfigPage: 0,
    };

    if (props.urlState.createdTag) {
      this.loadTag();
    }
  }

  public render() {
    const blockStartingIndex = this.state.currentConfigPage * 5;

    return (
      <React.Fragment>
        <TagEdit
          tag={this.state.tag}
          configuration_blocks={{
            list: this.state.configuration_blocks.slice(blockStartingIndex, 5 + blockStartingIndex),
            page: this.state.currentConfigPage,
            total: this.state.configuration_blocks.length,
          }}
          onTagChange={(field: string, value: string | number) =>
            this.setState((oldState) => ({
              tag: { ...oldState.tag, [field]: value },
            }))
          }
          onConfigListChange={(index: number) => {
            this.setState({
              currentConfigPage: index,
            });
          }}
          onConfigAddOrEdit={(block: ConfigurationBlock) => {
            this.setState((previousState) => ({
              configuration_blocks: previousState.configuration_blocks.concat([block]),
            }));
          }}
          onConfigRemoved={(block: ConfigurationBlock) => {
            this.setState((previousState) => {
              const selectedIndex = previousState.configuration_blocks.findIndex((c) => {
                return isEqual(block, c);
              });
              const blocks = [...previousState.configuration_blocks];
              blocks.splice(selectedIndex, 1);
              return {
                configuration_blocks: blocks,
              };
            });
          }}
        />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              disabled={
                this.state.tag.name.search(/^[A-Za-z0-9? ,_-]+$/) === -1 ||
                this.state.tag.name === '' ||
                this.state.configuration_blocks.length === 0
              }
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
    const createBlocksResponse = await this.props.libs.configBlocks.upsert(
      this.state.configuration_blocks.map((block) => ({ ...block, tag: this.state.tag.id }))
    );
    const creationError = createBlocksResponse.results.reduce(
      (err: string, resp) => (!err ? (err = resp.error ? resp.error.message : '') : err),
      ''
    );
    if (creationError) {
      return alert(creationError);
    }
    this.props.setUrlState({
      createdTag: newTag.id,
    });
    this.props.goTo(`/walkthrough/initial/finish`);
  };
}
