/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// First step, select type, options (fields for each one underneath, all of them accept “Other settings” as a raw input):
// Filebeat Input
//  - List of file paths (ie.  “/var/log/*.log”)
// Filebeat Module
//  - Module name, choose from a list: system, apache2, nginx, mongodb, elasticsearch…
// Metricbeat Module
//  - Module name, choose from a list: system, apache2, nginx, mongodb… (this list is different from filebeat’s)
//  - hosts: list of hosts to query (ie. localhost:9200)
//  - period: 10s by default
// Output
//  - Output type, choose from a list: elasticsearch, logstash, kafka, console
//  - hosts: list of hosts (ie. https://…)
//  - username
//  - password
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
  EuiSearchBar,
  // @ts-ignore
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { ConfigForm } from './form_editor';
interface ComponentProps {
  onClose(): any;
}

export class ConfigView extends React.Component<ComponentProps, any> {
  private form = React.createRef<any>();
  constructor(props: any) {
    super(props);
    this.state = {
      valid: false,
    };
  }
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
                content: (
                  <ConfigForm
                    // tslint:disable-next-line:no-console
                    onSubmit={data => console.log(data)}
                    canSubmit={canIt => this.setState({ valid: canIt })}
                    ref={this.form}
                    schema={[
                      {
                        id: 'string',
                        ui: {
                          name: 'string',
                          type: 'multi-input',
                        },
                        validations: 'isPaths',
                        error: 'This must be filled out',
                        required: true,
                      },
                    ]}
                  />
                ),
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
