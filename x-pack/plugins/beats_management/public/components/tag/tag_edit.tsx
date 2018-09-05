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
import { isEqual } from 'lodash';
import React from 'react';
import { BeatTag, CMBeat, ConfigurationBlock } from '../../../common/domain_types';
import { ConfigList } from '../config_list';
import { Table } from '../table';
import { BeatsTableType } from '../table';
import { ConfigView } from './config_view';

interface TagEditProps {
  mode: 'edit' | 'create';
  tag: Pick<BeatTag, Exclude<keyof BeatTag, 'last_updated'>>;
  onTagChange: (field: keyof BeatTag, value: string) => any;
  attachedBeats: CMBeat[] | null;
}

interface TagEditState {
  showFlyout: boolean;
  tableRef: any;
  selectedConfigIndex?: number;
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
          alignItems={
            tag.configuration_blocks && tag.configuration_blocks.length ? 'stretch' : 'center'
          }
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
                configs={tag.configuration_blocks}
                onConfigClick={(action: string, config: ConfigurationBlock) => {
                  const selectedIndex = tag.configuration_blocks.findIndex(c => {
                    return isEqual(config, c);
                  });
                  if (action === 'delete') {
                    const configs = [...tag.configuration_blocks];
                    configs.splice(selectedIndex, 1);
                    this.updateTag('configuration_blocks', configs);
                  } else {
                    this.setState({
                      showFlyout: true,
                      selectedConfigIndex: selectedIndex,
                    });
                  }
                }}
              />
              <br />
              <EuiButton
                onClick={() => {
                  this.setState({ showFlyout: true });
                }}
              >
                Add a new configuration
              </EuiButton>
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
                /* TODO: this prop should be optional */
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
            configBlock={
              this.state.selectedConfigIndex !== undefined
                ? tag.configuration_blocks[this.state.selectedConfigIndex]
                : undefined
            }
            onClose={() => this.setState({ showFlyout: false, selectedConfigIndex: undefined })}
            onSave={(config: any) => {
              this.setState({ showFlyout: false, selectedConfigIndex: undefined });
              if (this.state.selectedConfigIndex !== undefined) {
                const configs = [...tag.configuration_blocks];
                configs[this.state.selectedConfigIndex] = config;
                this.updateTag('configuration_blocks', configs);
              } else {
                this.updateTag('configuration_blocks', [...tag.configuration_blocks, config]);
              }
            }}
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

  // TODO this should disable save button on bad validations
  private updateTag = (key: keyof BeatTag, value?: any) =>
    value !== undefined
      ? this.props.onTagChange(key, value)
      : (e: any) => this.props.onTagChange(key, e.target ? e.target.value : e);
}
