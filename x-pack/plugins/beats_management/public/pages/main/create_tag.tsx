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
  EuiColorPicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiForm,
  EuiFormRow,
  EuiPanel,
  // @ts-ignore
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import 'brace/mode/yaml';
import 'brace/theme/github';
import React from 'react';
import { ConfigurationBlockTypes } from '../../../common/constants';
import { ConfigurationBlock } from '../../../common/domain_types';
import { FrontendLibs } from '../../lib/lib';

interface CreateTagPageProps {
  libs: FrontendLibs;
}

interface CreateTagPageState {
  color: string | null;
  configurationBlocks: ConfigurationBlock[];
  tagName: string | null;
}

export class CreateTagPage extends React.PureComponent<CreateTagPageProps, CreateTagPageState> {
  constructor(props: CreateTagPageProps) {
    super(props);

    this.state = {
      color: '#DD0A73',
      configurationBlocks: [],
      tagName: null,
    };
  }

  public render() {
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
                {configurationBlocks.length > 0 && (
                  <div>
                    {configurationBlocks.map((block, index) => (
                      <div key={index}>
                        <EuiFormRow label="Block type">
                          <EuiSelect options={this.getConfigurationOptions()} />
                        </EuiFormRow>
                        <EuiFormRow label="Block YAML">
                          <EuiFieldText onChange={this.getOnConfigurationBlockUpdate(index)} />
                        </EuiFormRow>
                        <EuiSpacer size="s" />
                      </div>
                    ))}
                    <EuiSpacer size="m" />
                  </div>
                )}
                <EuiButton onClick={this.addConfigurationBlock}>Add a new configuration</EuiButton>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
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
      </div>
    );
  }

  private getConfigurationOptions = () => {
    const types = [];
    for (const type in ConfigurationBlockTypes) {
      if (typeof ConfigurationBlockTypes[type] === 'string') {
        types.push({ text: type, value: ConfigurationBlockTypes[type] });
      }
    }
    return types;
  };

  private addConfigurationBlock = () => {
    const { configurationBlocks } = this.state;
    this.setState({
      configurationBlocks: [
        ...configurationBlocks,
        {
          type: ConfigurationBlockTypes.FilebeatInputs,
          block_yml: '',
        },
      ],
    });
  };
  private handleConfigChange = (index: number, value: string) => {
    const { configurationBlocks } = this.state;
    configurationBlocks[index].block_yml = value;
    this.setState({ configurationBlocks });
  };
  private getOnConfigurationBlockUpdate = (index: number) => (e: any) => {
    this.handleConfigChange(index, e.target.value);
  };
  private updateBadgeName = (e: any) => this.setState({ tagName: e.target.value });
  private updateBadgeColor = (e: any) => this.setState({ color: e });
}
