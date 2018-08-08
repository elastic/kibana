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
import { ConfigurationBlock } from '../../../common/domain_types';
import { Table } from '../table';
import { BeatsTableType } from '../table';
import { TagViewConfig } from '../tag';

interface TagEditProps {
  items: any[];
  config: TagViewConfig;
}

interface TagEditState {
  color: string | null;
  configurationBlocks: ConfigurationBlock[];
  showFlyout: boolean;
  tableRef: any;
  tagName: string | null;
}

export class TagEdit extends React.PureComponent<TagEditProps, TagEditState> {
  constructor(props: TagEditProps) {
    super(props);

    this.state = {
      color: '#DD0A73',
      configurationBlocks: [],
      showFlyout: false,
      tableRef: React.createRef(),
      tagName: null,
    };
  }

  public render() {
    const {
      config: { showAttachedBeats },
      items,
    } = this.props;
    const { color, configurationBlocks, tagName } = this.state;
    return (
      <div>
        <EuiTitle size="m">
          <h1>Add a new tag</h1>
        </EuiTitle>
        <EuiSpacer size="m" />
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
                <EuiBadge color={color ? color : '#FF0'}>{tagName ? tagName : 'Tag name'}</EuiBadge>
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiForm>
                <EuiFormRow label="Name">
                  <EuiFieldText
                    name="tagName"
                    onChange={this.updateBadgeName}
                    placeholder="Tag name"
                  />
                </EuiFormRow>
                <EuiFormRow label="Color">
                  <EuiColorPicker color={color} onChange={this.updateBadgeColor} />
                </EuiFormRow>
              </EuiForm>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer />
        <EuiPanel>
          <EuiFlexGroup alignItems={configurationBlocks.length ? 'stretch' : 'center'}>
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
        {showAttachedBeats && (
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
              items={items}
              ref={this.state.tableRef}
              showAssignmentOptions={false}
              type={BeatsTableType}
            />
          </EuiPanel>
        )}
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton fill isDisabled={true}>
              Save
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty>Cancel</EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
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
  private updateBadgeColor = (e: any) => this.setState({ color: e });
  private updateBadgeName = (e: any) => this.setState({ tagName: e.target.value });
}
