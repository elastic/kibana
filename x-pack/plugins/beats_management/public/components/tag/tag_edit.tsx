/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiBadge,
  EuiButton,
  // @ts-ignore
  EuiColorPicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import 'brace/mode/yaml';
import 'brace/theme/github';
import React from 'react';
import { CMBeat } from '../../../common/domain_types';
import { ClientSideBeatTag, ClientSideConfigurationBlock } from '../../lib/lib';
import { ConfigList } from '../config_list';
import { Table } from '../table';
import { BeatsTableType } from '../table';
import { ConfigView } from './config_view';

interface TagEditProps {
  mode: 'edit' | 'create';
  tag: Pick<ClientSideBeatTag, Exclude<keyof ClientSideBeatTag, 'last_updated'>>;
  onTagChange: (field: keyof ClientSideBeatTag, value: string) => any;
  attachedBeats: CMBeat[] | null;
}

interface TagEditState {
  showFlyout: boolean;
  tableRef: any;
}

export class TagEdit extends React.PureComponent<TagEditProps, TagEditState> {
  constructor(props: TagEditProps) {
    super(props);

    this.state = {
      showFlyout: false,
      tableRef: React.createRef(),
    };
  }

  public render() {
    const { tag, attachedBeats } = this.props;
    return (
      <div>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>Define this tag</h3>
            </EuiTitle>
            <EuiText color="subdued">
              <p>
                Tags will apply a set configuration to a group of beats.
                <br />
                The tag type defines the options available.
              </p>
            </EuiText>
            <div>
              <EuiBadge color={tag.color ? tag.color : '#FF0'}>
                {tag.id ? tag.id : 'Tag name'}
              </EuiBadge>
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiForm>
              <EuiFormRow
                label="Name"
                isInvalid={!!this.getNameError(tag.id)}
                error={this.getNameError(tag.id) || undefined}
              >
                <EuiFieldText
                  name="name"
                  isInvalid={!!this.getNameError(tag.id)}
                  onChange={this.updateTag('id')}
                  disabled={this.props.mode === 'edit'}
                  value={tag.id}
                  placeholder="Tag name (required)"
                />
              </EuiFormRow>
              {this.props.mode === 'create' && (
                <EuiFormRow label="Color">
                  <EuiColorPicker color={tag.color} onChange={this.updateTag('color')} />
                </EuiFormRow>
              )}
            </EuiForm>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiHorizontalRule />

        <EuiFlexGroup
          alignItems={tag.configurations && tag.configurations.length ? 'stretch' : 'center'}
        >
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>Configurations</h3>
            </EuiTitle>
            <EuiText color="subdued">
              <p>
                You can have multiple configurations applied to an individual tag. These
                configurations can repeat or mix types as necessary. For example, you may utilize
                three metricbeat configurations alongside one input and filebeat configuration.
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <div>
              <ConfigList
                configs={tag.configurations}
                onConfigClick={(action: string, config: ClientSideConfigurationBlock) => {
                  if (action === 'delete') {
                    // TODO delete
                  }
                }}
              />
              <br />
              <EuiButton onClick={this.openConfigFlyout}>Add a new configuration</EuiButton>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        {attachedBeats && (
          <div>
            <EuiHorizontalRule />

            <EuiTitle size="xs">
              <h3>Attached Beats</h3>
            </EuiTitle>
            <Table
              actionHandler={(a, b) => {
                /* TODO: handle assignment/delete actions */
              }}
              assignmentOptions={[]}
              assignmentTitle={null}
              items={attachedBeats}
              ref={this.state.tableRef}
              showAssignmentOptions={false}
              type={BeatsTableType}
            />
          </div>
        )}

        {this.state.showFlyout && (
          <ConfigView
            configBlock={undefined}
            onClose={() => this.setState({ showFlyout: false })}
            onSave={this.updateTag('configurations')}
          />
        )}
      </div>
    );
  }

  private getNameError = (name: string) => {
    if (name && name !== '' && name.search(/^[a-zA-Z0-9-]+$/) === -1) {
      return 'Tag name must consist of letters, numbers, and dashes only';
    } else {
      return false;
    }
  };

  private openConfigFlyout = () => {
    this.setState({
      showFlyout: true,
    });
  };

  // TODO this should disable save button on bad validations
  private updateTag = (key: keyof ClientSideBeatTag) => (e: any) =>
    this.props.onTagChange(key, e.target ? e.target.value : e);
}
