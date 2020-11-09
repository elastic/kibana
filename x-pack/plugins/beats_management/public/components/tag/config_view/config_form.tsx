/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { i18n } from '@kbn/i18n';
import Formsy from 'formsy-react';
import { get } from 'lodash';
import React from 'react';
import { ConfigBlockSchema, ConfigurationBlock } from '../../../../common/domain_types';
import {
  FormsyEuiCodeEditor,
  FormsyEuiFieldText,
  FormsyEuiMultiFieldText,
  FormsyEuiPasswordText,
  FormsyEuiSelect,
} from '../../inputs';

interface ComponentProps {
  values: ConfigurationBlock;
  schema: ConfigBlockSchema;
  id: string;
  onSubmit?: (modal: any) => any;
  canSubmit(canIt: boolean): any;
}

interface ComponentState {
  canSubmit: boolean;
}

class ConfigFormUi extends React.Component<ComponentProps, ComponentState> {
  private form = React.createRef<HTMLButtonElement>();
  constructor(props: ComponentProps) {
    super(props);

    this.state = {
      canSubmit: false,
    };
  }

  public enableButton = () => {
    this.setState({
      canSubmit: true,
    });
    this.props.canSubmit(true);
  };
  public disableButton = () => {
    this.setState({
      canSubmit: false,
    });
    this.props.canSubmit(false);
  };
  public submit = () => {
    if (this.form.current && this.props.onSubmit) {
      this.form.current.click();
    }
  };
  public onValidSubmit = <ModelType extends any>(model: ModelType) => {
    if (!this.props.onSubmit) {
      return;
    }

    this.props.onSubmit(model);
  };
  public render() {
    return (
      <div>
        <br />
        <Formsy
          onValidSubmit={this.onValidSubmit}
          onValid={this.enableButton}
          onInvalid={this.disableButton}
        >
          {this.props.schema.configs.map((schema) => {
            switch (schema.ui.type) {
              case 'input':
                return (
                  <FormsyEuiFieldText
                    key={schema.id}
                    id={schema.id}
                    defaultValue={get(
                      this.props,
                      `values.config.${schema.id}`,
                      schema.defaultValue
                    )}
                    name={schema.id}
                    disabled={!this.props.onSubmit}
                    helpText={schema.ui.helpText}
                    placeholder={schema.ui.placeholder}
                    label={schema.ui.label}
                    validationError={schema.error}
                    required={schema.required || false}
                  />
                );
              case 'password':
                return (
                  <FormsyEuiPasswordText
                    key={schema.id}
                    id={schema.id}
                    disabled={!this.props.onSubmit}
                    defaultValue={get(
                      this.props,
                      `values.config.${schema.id}`,
                      schema.defaultValue
                    )}
                    name={schema.id}
                    placeholder={schema.ui.placeholder}
                    helpText={schema.ui.helpText}
                    label={schema.ui.label}
                    validationError={schema.error}
                    required={schema.required || false}
                  />
                );
              case 'multi-input':
                return (
                  <FormsyEuiMultiFieldText
                    key={schema.id}
                    id={schema.id}
                    disabled={!this.props.onSubmit}
                    defaultValue={get(
                      this.props,
                      `values.config.${schema.id}`,
                      schema.defaultValue
                    )}
                    name={schema.id}
                    placeholder={schema.ui.placeholder}
                    helpText={schema.ui.helpText}
                    label={schema.ui.label}
                    validationError={schema.error}
                    required={schema.required}
                  />
                );
              case 'select':
                return (
                  <FormsyEuiSelect
                    key={schema.id}
                    id={schema.id}
                    name={schema.id}
                    disabled={!this.props.onSubmit}
                    defaultValue={get(
                      this.props,
                      `values.config.${schema.id}`,
                      schema.defaultValue
                    )}
                    helpText={schema.ui.helpText}
                    label={schema.ui.label}
                    options={[
                      {
                        value: '',
                        text: i18n.translate('xpack.beatsManagement.table.selectOptionLabel', {
                          defaultMessage: 'Please Select An Option',
                        }),
                      },
                    ].concat(schema.options || [])}
                    validationError={schema.error}
                    required={schema.required}
                  />
                );
              case 'code':
                return (
                  <FormsyEuiCodeEditor
                    key={`${schema.id}-${this.props.id}`}
                    mode="yaml"
                    disabled={!this.props.onSubmit}
                    id={schema.id}
                    defaultValue={get(
                      this.props,
                      `values.config.${schema.id}`,
                      schema.defaultValue
                    )}
                    name={schema.id}
                    helpText={schema.ui.helpText}
                    label={schema.ui.label}
                    options={schema.options ? schema.options : []}
                    validationError={schema.error}
                    required={schema.required}
                  />
                );
            }
          })}
          {this.props.schema && (
            <FormsyEuiCodeEditor
              mode="yaml"
              disabled={!this.props.onSubmit}
              id={'other'}
              defaultValue={get(this.props, `values.config.other`, '')}
              name={'other'}
              helpText={i18n.translate('xpack.beatsManagement.config.otherConfigDescription', {
                defaultMessage: 'Use YAML format to specify other settings for the Filebeat Input',
              })}
              label={i18n.translate('xpack.beatsManagement.config.otherConfigLabel', {
                defaultMessage: 'Other Config',
              })}
              validationError={i18n.translate('xpack.beatsManagement.config.other.error', {
                defaultMessage: 'Use valid YAML format',
              })}
              required={false}
            />
          )}
          {this.props.onSubmit && (
            <button
              type="submit"
              style={{ display: 'none' }}
              disabled={!this.state.canSubmit}
              ref={this.form}
            />
          )}
        </Formsy>
      </div>
    );
  }
}
export const ConfigForm = ConfigFormUi;
