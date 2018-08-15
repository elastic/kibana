/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  // @ts-ignore
  EuiCodeEditor,
  // @ts-ignore
  EuiColorPicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  // @ts-ignore
  EuiForm,
  EuiFormRow,
  EuiPanel,
  // @ts-ignore
  EuiSearchBar,
  EuiSpacer,
  // @ts-ignore
  EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import 'brace/mode/yaml';
import 'brace/theme/github';
import React from 'react';
import { BeatTag, CMBeat } from '../../../common/domain_types';
import { Table } from '../table';
import { BeatsTableType } from '../table';

interface TagEditProps {
  tag: Partial<BeatTag>;
  onTagChange: (field: keyof BeatTag, value: string) => any;
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
        <EuiPanel>
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
                <EuiFormRow label="Name">
                  <EuiFieldText
                    name="name"
                    onChange={this.updateTag('id')}
                    value={tag.id}
                    placeholder="Tag name (required)"
                  />
                </EuiFormRow>
                <EuiFormRow label="Color">
                  <EuiColorPicker color={tag.color} onChange={this.updateTag('color')} />
                </EuiFormRow>
              </EuiForm>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer />
        <EuiPanel>
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
                <EuiButton onClick={this.openConfigFlyout}>Add a new configuration</EuiButton>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer />
        {attachedBeats && (
          <EuiPanel paddingSize="m">
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
          </EuiPanel>
        )}

        {this.state.showFlyout && (
          <EuiFlyout onClose={() => this.setState({ showFlyout: false })}>
            <EuiFlyoutHeader>
              <EuiTitle size="m">
                <h2>Add Configuration</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <EuiFormRow label="Configuration type">
                <EuiSearchBar
                  onChange={() => {
                    // TODO: handle search changes
                  }}
                />
              </EuiFormRow>
              <EuiFormRow label="Configuration description">
                <EuiFieldText
                  onChange={() => {
                    // TODO: update field value
                  }}
                  placeholder="Description (optional)"
                />
              </EuiFormRow>
              <EuiTabbedContent
                tabs={[
                  {
                    id: 'basic_settings',
                    name: 'Basic Settings',
                    content: <div>Add configuration options here</div>,
                  },
                  {
                    id: 'yaml_editor',
                    name: 'YAML Editor',
                    content: <EuiCodeEditor mode="yaml" theme="github" />,
                  },
                ]}
              />
            </EuiFlyoutBody>
            <EuiFlyoutFooter>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="cross"
                    onClick={() => this.setState({ showFlyout: false })}
                  >
                    Close
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton fill>Save</EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </EuiFlyout>
        )}
      </div>
    );
  }

  private openConfigFlyout = () => {
    this.setState({
      showFlyout: true,
    });
  };
  private updateTag = (key: keyof BeatTag) => (e: any) =>
    this.props.onTagChange(key, e.target ? e.target.value : e);
}
