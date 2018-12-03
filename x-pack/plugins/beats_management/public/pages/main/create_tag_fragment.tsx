/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import 'brace/mode/yaml';

import 'brace/theme/github';
import React from 'react';
import { BeatTag } from '../../../common/domain_types';
import { AppURLState } from '../../app';
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
  tag: BeatTag;
}

class CreateTagFragment extends React.PureComponent<TagPageProps, TagPageState> {
  private mode: 'edit' | 'create' = 'create';
  constructor(props: TagPageProps) {
    super(props);
    this.state = {
      showFlyout: false,
      tag: {
        id: props.urlState.createdTag ? props.urlState.createdTag : '',
        color: '#DD0A73',
        configuration_blocks: [],
        last_updated: new Date(),
      },
    };

    if (props.urlState.createdTag) {
      this.mode = 'edit';
      this.loadTag();
    }
  }

  public render() {
    return (
      <React.Fragment>
        <TagEdit
          tag={this.state.tag}
          mode={this.mode}
          onDetachBeat={(beatIds: string[]) => {
            this.props.libs.beats.removeTagsFromBeats(
              beatIds.map(id => {
                return { beatId: id, tag: this.state.tag.id };
              })
            );
          }}
          onTagChange={(field: string, value: string | number) =>
            this.setState(oldState => ({
              tag: { ...oldState.tag, [field]: value },
            }))
          }
          attachedBeats={null}
        />
        <EuiSpacer />
        <EuiHorizontalRule />

        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              disabled={
                this.state.tag.id.search(/^[a-zA-Z0-9-]+$/) === -1 ||
                this.state.tag.id === '' ||
                this.state.tag.configuration_blocks.length === 0
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
    const { intl } = this.props;
    const newTag = await this.props.libs.tags.upsertTag(this.state.tag as BeatTag);
    if (!newTag) {
      return alert(
        intl.formatMessage({
          id: 'xpack.beatsManagement.createTag.errorSavingTagTitle',
          defaultMessage: 'error saving tag',
        })
      );
    }
    this.props.setUrlState({
      createdTag: newTag.id,
    });
    this.props.goTo(`/overview/initial/finish`);
  };
}
const CreateTagPageFragmentUi = withUrlState<TagPageProps>(CreateTagFragment);

export const CreateTagPageFragment = injectI18n(CreateTagPageFragmentUi);
