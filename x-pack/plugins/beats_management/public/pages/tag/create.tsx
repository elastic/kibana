/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import 'brace/mode/yaml';
import 'brace/theme/github';
import React from 'react';
import { BeatTag } from '../../../common/domain_types';
import { TagEdit } from '../../components/tag';
import { FrontendLibs } from '../../lib/lib';

interface CreateTagPageProps {
  libs: FrontendLibs;
  history: any;
}

interface CreateTagPageState {
  showFlyout: boolean;
  tag: BeatTag;
}

export class CreateTagPage extends React.PureComponent<CreateTagPageProps, CreateTagPageState> {
  constructor(props: CreateTagPageProps) {
    super(props);

    this.state = {
      showFlyout: false,
      tag: {
        id: '',
        color: '#DD0A73',
        configuration_blocks: [],
        last_updated: new Date(),
      },
    };
  }

  public render() {
    return (
      <div>
        <TagEdit
          tag={this.state.tag}
          onTagChange={(field: string, value: string) =>
            this.setState(oldState => ({
              tag: { ...oldState.tag, [field]: value },
            }))
          }
          attachedBeats={null}
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
            <EuiButtonEmpty onClick={() => this.props.history.push('/overview/tags')}>
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }

  private saveTag = async () => {
    await this.props.libs.tags.upsertTag(this.state.tag as BeatTag);
    this.props.history.push('/overview/tags');
  };
}
