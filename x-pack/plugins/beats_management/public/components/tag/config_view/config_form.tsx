/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import Formsy, { addValidationRule, FieldValue, FormData } from 'formsy-react';
import yaml from 'js-yaml';
import { get } from 'lodash';
import React from 'react';
import { ConfigurationBlock } from '../../../../common/domain_types';
import { YamlConfigSchema } from '../../../lib/lib';
import {
  FormsyEuiCodeEditor,
  FormsyEuiFieldText,
  FormsyEuiMultiFieldText,
  FormsyEuiPasswordText,
  FormsyEuiSelect,
} from '../../inputs';

addValidationRule('isHosts', (form: FormData, values: FieldValue | string[]) => {
  if (values && values.length > 0 && values instanceof Array) {
    return values.reduce((pass: boolean, value: string) => {
      if (
        pass &&
        value.match(
          new RegExp(
            '^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]).)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$'
          )
        ) !== null
      ) {
        return true;
      }
      return false;
    }, true);
  } else {
    return true;
  }
});

addValidationRule('isString', (values: FormData, value: FieldValue) => {
  return true;
});

addValidationRule('isPeriod', (values: FormData, value: FieldValue) => {
  // TODO add more validation
  return true;
});

addValidationRule('isPath', (values: FormData, value: FieldValue) => {
  // TODO add more validation
  return value && value.length > 0;
});

addValidationRule('isPaths', (values: FormData, value: FieldValue) => {
  // TODO add more validation

  return true;
});

addValidationRule('isYaml', (values: FormData, value: FieldValue) => {
  try {
    const stuff = yaml.safeLoad(value || '');
    if (typeof stuff === 'string') {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
});

interface ComponentProps {
  values: ConfigurationBlock;
  schema: YamlConfigSchema[];
  id: string;
  onSubmit?: (modal: any) => any;
  canSubmit(canIt: boolean): any;
}

export class ConfigForm extends React.Component<ComponentProps, any> {
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
          {this.props.schema.map(schema => {
            switch (schema.ui.type) {
              case 'input':
                return (
                  <FormsyEuiFieldText
                    key={schema.id}
                    id={schema.id}
                    defaultValue={get(
                      this.props,
                      `values.configs[0].${schema.id}`,
                      schema.defaultValue
                    )}
                    name={schema.id}
                    disabled={!this.props.onSubmit}
                    helpText={schema.ui.helpText}
                    placeholder={schema.ui.placeholder}
                    label={schema.ui.label}
                    validations={schema.validations}
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
                      `values.configs[0].${schema.id}`,
                      schema.defaultValue
                    )}
                    name={schema.id}
                    placeholder={schema.ui.placeholder}
                    helpText={schema.ui.helpText}
                    label={schema.ui.label}
                    validations={schema.validations}
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
                      `values.configs[0].${schema.id}`,
                      schema.defaultValue
                    )}
                    name={schema.id}
                    placeholder={schema.ui.placeholder}
                    helpText={schema.ui.helpText}
                    label={schema.ui.label}
                    validations={schema.validations}
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
                      `values.configs[0].${schema.id}`,
                      schema.defaultValue
                    )}
                    helpText={schema.ui.helpText}
                    label={schema.ui.label}
                    options={[{ value: '', text: 'Please Select An Option' }].concat(
                      schema.options || []
                    )}
                    validations={schema.validations}
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
                      `values.configs[0].${schema.id}`,
                      schema.defaultValue
                    )}
                    name={schema.id}
                    helpText={schema.ui.helpText}
                    label={schema.ui.label}
                    options={schema.options ? schema.options : []}
                    validations={schema.validations}
                    validationError={schema.error}
                    required={schema.required}
                  />
                );
            }
          })}
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
