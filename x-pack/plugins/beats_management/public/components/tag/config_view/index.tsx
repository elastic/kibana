/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  // @ts-ignore
  EuiCodeEditor,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  // @ts-ignore
  EuiHorizontalRule,
  // @ts-ignore
  EuiSearchBar,
  // @ts-ignore
  EuiSelect,
  // @ts-ignore
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { ConfigurationBlock } from '../../../../common/domain_types';
import { supportedConfigs } from '../../../config_schemas';
import { ConfigForm } from './config_form';

interface ComponentProps {
  configBlock?: ConfigurationBlock;
  onClose(): any;
  onSave?(config: ConfigurationBlock): any;
}

export class ConfigView extends React.Component<ComponentProps, any> {
  private form = React.createRef<any>();
  private editMode: boolean;
  constructor(props: any) {
    super(props);
    this.editMode = props.configBlock !== undefined;

    this.state = {
      valid: false,
      configBlock: props.configBlock || {
        type: supportedConfigs[0].value,
      },
    };
  }
  public onValueChange = (field: string) => (e: any) => {
    const value = e.currentTarget ? e.currentTarget.value : e;
    this.setState((state: any) => ({
      configBlock: {
        ...state.configBlock,
        [field]: value,
      },
    }));
  };
  public render() {
    return (
      <EuiFlyout onClose={this.props.onClose}>
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2>
              {this.editMode
                ? this.props.onSave
                  ? 'Edit configuration'
                  : 'View configuration'
                : 'Add configuration'}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFormRow label="Type">
            <EuiSelect
              options={supportedConfigs}
              value={this.state.configBlock.type}
              disabled={this.editMode}
              onChange={this.onValueChange('type')}
            />
          </EuiFormRow>
          <EuiFormRow label="Description">
            <EuiFieldText
              value={this.state.configBlock.description}
              disabled={!this.props.onSave}
              onChange={this.onValueChange('description')}
              placeholder="Description (optional)"
            />
          </EuiFormRow>
          <h3>
            {
              (supportedConfigs.find(config => this.state.configBlock.type === config.value) as any)
                .text
            }
            &nbsp;configuration
          </h3>
          <EuiHorizontalRule />

          <ConfigForm
            onSubmit={
              this.props.onSave
                ? data => {
                    if (this.props.onSave) {
                      this.props.onSave({
                        ...this.state.configBlock,
                        configs: [data],
                      });
                    }
                    this.props.onClose();
                  }
                : undefined
            }
            canSubmit={canIt => this.setState({ valid: canIt })}
            ref={this.form}
            values={this.state.configBlock}
            id={
              (supportedConfigs.find(config => this.state.configBlock.type === config.value) as any)
                .value
            }
            schema={
              (supportedConfigs.find(config => this.state.configBlock.type === config.value) as any)
                .config
            }
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={this.props.onClose}>
                Close
              </EuiButtonEmpty>
            </EuiFlexItem>
            {this.props.onSave && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  disabled={!this.state.valid}
                  fill
                  onClick={() => {
                    if (this.form.current) {
                      this.form.current.submit();
                    }
                  }}
                >
                  Save
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
