/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import 'brace/mode/yaml';
import 'brace/theme/github';
import React from 'react';
import { TagEdit } from '../../components/tag';
import { ClientSideBeatTag, FrontendLibs } from '../../lib/lib';

interface CreateTagPageProps {
  libs: FrontendLibs;
  history: any;
}

interface CreateTagPageState {
  showFlyout: boolean;
  tag: ClientSideBeatTag;
}

export class CreateTagPage extends React.PureComponent<CreateTagPageProps, CreateTagPageState> {
  constructor(props: CreateTagPageProps) {
    super(props);

    this.state = {
      showFlyout: false,
      tag: {
        id: '',
        color: '#DD0A73',
        configurations: [],
        last_updated: new Date(),
      },
    };
  }

  public render() {
    return (
      <div>
        <TagEdit
          tag={this.state.tag}
          onTagChange={(field: string, value: string | number) =>
            this.setState(oldState => {
              let newValue;
              if (field === 'configurations') {
                newValue = [...oldState.tag.configurations, value];
              } else {
                newValue = value;
              }

              return {
                tag: { ...oldState.tag, [field]: newValue },
              };
            })
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
    await this.props.libs.tags.upsertTag(this.state.tag as ClientSideBeatTag);
    this.props.history.push('/overview/tags');
  };
}
