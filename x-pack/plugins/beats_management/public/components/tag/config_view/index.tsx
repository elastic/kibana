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
import { ConfigForm } from './config_form';
import { supportedConfigs } from './config_schemas';

interface ComponentProps {
  values: {};
  onClose(): any;
}

export class ConfigView extends React.Component<ComponentProps, any> {
  private form = React.createRef<any>();
  constructor(props: any) {
    super(props);
    this.state = {
      valid: false,
      type: supportedConfigs[0].value,
    };
  }
  public onTypeChange = (e: any) => {
    this.setState({
      type: e.target.value,
    });
  };
  public render() {
    return (
      <EuiFlyout onClose={this.props.onClose}>
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2>Add Configuration</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFormRow label="Configuration type">
            <EuiSelect
              options={supportedConfigs}
              value={this.state.type}
              onChange={this.onTypeChange}
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
          <h3>
            Config for{' '}
            {(supportedConfigs.find(config => this.state.type === config.value) as any).text}
          </h3>
          <EuiHorizontalRule />

          <ConfigForm
            // tslint:disable-next-line:no-console
            onSubmit={data => console.log(data)}
            canSubmit={canIt => this.setState({ valid: canIt })}
            ref={this.form}
            values={this.props.values}
            id={(supportedConfigs.find(config => this.state.type === config.value) as any).value}
            schema={
              (supportedConfigs.find(config => this.state.type === config.value) as any).config
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
            <EuiFlexItem grow={false}>
              <EuiButton
                disabled={this.state.valid}
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
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
