/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import React, { Component } from 'react';
import {
  Embeddable,
  embeddableFactories,
  OutputSpec,
  Trigger,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { BrowseOutputParameters } from './browse_output_parameters';

interface Props {
  embeddableTemplateMapping: { [templateName: string]: string };
  onMappingChange: (mapping: { [templateName: string]: string }) => void;
  embeddable?: Embeddable;
  trigger?: Trigger;
  factoryName: string;
}

interface State {
  embeddableTemplateMapping: { [templateName: string]: string };
  embeddableTemplateName: string;
  embeddableTemplatePath: string;
}

export class ConfigureTemplateParameters extends Component<Props, State> {
  private outputSpec: OutputSpec;
  constructor(props: Props) {
    super(props);

    this.state = {
      embeddableTemplateMapping: this.props.embeddableTemplateMapping,
      embeddableTemplateName: '',
      embeddableTemplatePath: '',
    };

    const factory = embeddableFactories.getFactoryByName(this.props.factoryName);
    this.outputSpec = this.props.embeddable
      ? this.props.embeddable.getOutputSpec(this.props.trigger)
      : factory.getOutputSpec();
  }

  public render() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiForm>
            <EuiFlexGroup>
              <EuiFlexItem>
                <h2>Element template parameters</h2>
                <EuiSpacer size="s" />
                {this.renderExistingParameterRows(this.state.embeddableTemplateMapping)}
                {this.renderNewParameterRow()}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>
          <BrowseOutputParameters
            onAdd={path => this.setState({ embeddableTemplatePath: path })}
            embeddable={this.props.embeddable}
            trigger={this.props.trigger}
            factoryName={this.props.factoryName}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private postConfigChange = () => {
    this.props.onMappingChange(this.state.embeddableTemplateMapping);
  };

  private renderNewParameterRow() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label="Template Name"
            error={this.state.embeddableTemplateName === '' ? ['Empty name'] : []}
            isInvalid={this.state.embeddableTemplateName === ''}
          >
            <EuiFieldText
              name="Template name"
              onChange={this.setNewEmbeddableTemplateName}
              value={this.state.embeddableTemplateName}
              isInvalid={this.state.embeddableTemplateName === ''}
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            label="Path"
            error={this.getErrors(this.state.embeddableTemplatePath)}
            isInvalid={this.isInvalidPath(this.state.embeddableTemplatePath)}
          >
            <EuiFieldText
              name="Access path"
              onChange={this.setNewEmbeddableTemplatePath}
              value={this.state.embeddableTemplatePath}
              isInvalid={this.isInvalidPath(this.state.embeddableTemplatePath)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButton
              onClick={this.addEmbeddableMapping}
              disabled={
                this.state.embeddableTemplatePath === '' || this.state.embeddableTemplateName === ''
              }
            >
              Add
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private isInvalidPath = (path: string) => {
    return (
      path === '' ||
      !Object.values(this.outputSpec).find(propertySpec => propertySpec.accessPath === path)
    );
  };

  private renderExistingParameterRows(mapping: { [key: string]: string }) {
    return Object.keys(mapping).map(key => {
      return (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Name">
              <EuiFieldText
                name="Template name"
                value={key}
                onChange={e => this.updateEmbeddableTemplateName(key, e.target.value)}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label="Access path"
              error={this.getErrors(mapping[key])}
              isInvalid={this.isInvalidPath(mapping[key])}
            >
              <EuiFieldText
                name="Access path"
                value={mapping[key]}
                onChange={e => this.setEmbeddableTemplatePath(key, e.target.value)}
                isInvalid={this.isInvalidPath(mapping[key])}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButtonIcon iconType="trash" onClick={() => this.deleteMapping(key, mapping)} />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    });
  }

  private getErrors(path: string) {
    if (!this.isInvalidPath(path)) {
      return [];
    } else if (path === '') {
      return ['Empty path'];
    } else {
      return ['Access path does not exist'];
    }
  }

  private deleteMapping = (name: string, mapping: { [key: string]: string }) => {
    delete mapping[name];
    this.setState({ embeddableTemplateMapping: mapping }, this.postConfigChange);
  };

  private addEmbeddableMapping = () => {
    this.setState(
      prevState => ({
        embeddableTemplateMapping: {
          ...prevState.embeddableTemplateMapping,
          [prevState.embeddableTemplateName]: prevState.embeddableTemplatePath,
        },
      }),
      this.postConfigChange
    );
  };

  private setEmbeddableTemplatePath = (key: string, path: string) => {
    this.setState(prevState => {
      const mapping = prevState.embeddableTemplateMapping;
      mapping[key] = path;
      return { embeddableMapping: mapping };
    }, this.postConfigChange);
  };

  private updateEmbeddableTemplateName = (oldName: string, newName: string) => {
    this.setState(prevState => {
      const mapping = prevState.embeddableTemplateMapping;
      const value = mapping[oldName];
      mapping[newName] = value;
      delete mapping[oldName];
      return { embeddableMapping: mapping };
    }, this.postConfigChange);
  };

  private setNewEmbeddableTemplateName = (e: any) => {
    this.setState({ embeddableTemplateName: e.target.value });
  };

  private setNewEmbeddableTemplatePath = (e: any) => {
    this.setState({ embeddableTemplatePath: e.target.value });
  };
}
