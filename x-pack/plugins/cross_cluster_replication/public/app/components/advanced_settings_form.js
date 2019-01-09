/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  EuiTitle,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiPanel,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiButtonIcon,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { debounce } from 'lodash';

import { getValidator, i18nValidationErrorMessages } from '../services/input_validation';

const parseError = (err) => {
  if (!err) {
    return null;
  }

  const [error] = err.details; // Use the first error in the details array (error.details[0])
  const { type, context: { label } } = error;
  const message = i18nValidationErrorMessages[type](label);
  return { message };
};

/**
 * State transitions: fields update
 */
export const updateFields = (newValues) => ({ fields }) => ({
  fields: {
    ...fields,
    ...newValues,
  },
});

/**
 * State transitions: errors update
 */
export const updateFormErrors = (errors, onFormValidityUpdate = () => undefined) => ({ fieldsErrors }) => {
  const updatedFieldsErrors = {
    ...fieldsErrors,
    ...errors,
  };

  const isFormValid = Object.values(updatedFieldsErrors).every(error => error === null);
  onFormValidityUpdate(isFormValid);

  return { fieldsErrors: updatedFieldsErrors };
};

/**
 * State transitions: add setting field to form and errors
 */
export const addField = (field, validator, onFormValidityUpdate) => ({ fields, fieldsErrors }) => {
  const fieldValue = '';
  const { error } = validator.validate({ [field]: fieldValue });
  const updatedFieldsErrors = updateFormErrors({ [field]: parseError(error) }, onFormValidityUpdate)({ fieldsErrors });

  return ({
    fields: {
      ...fields,
      [field]: fieldValue,
    },
    ...updatedFieldsErrors,
    previewSettingActive: null
  });
};

/**
 * State transitions: remove setting from fields and errors
 */
export const removeField = (field, onFormValidityUpdate = () => undefined) => ({ fields, fieldsErrors }) => {
  const { [field]: value, ...fieldsWithoutSetting } = fields; // eslint-disable-line no-unused-vars
  const { [field]: value2, ...fieldsErrorsWithoutSetting } = fieldsErrors; // eslint-disable-line no-unused-vars

  const isFormValid = Object.values(fieldsErrorsWithoutSetting).every(error => error === null);
  onFormValidityUpdate(isFormValid);

  return {
    fields: fieldsWithoutSetting,
    fieldsErrors: fieldsErrorsWithoutSetting,
  };
};

export class AdvancedSettingsForm extends PureComponent {
  static propTypes = {
    onFormValidityUpdate: PropTypes.func.isRequired,
    areErrorsVisible: PropTypes.bool.isRequired,
    schema: PropTypes.object.isRequired
  }

  state = {
    isOpened: false,
    fields: {},
    fieldsErrors: {},
    previewSettingActive: null,
  };

  constructor(props) {
    super(props);

    this.validateFields = debounce(this.validateFields.bind(this), 500);

    this.validator = getValidator(Object.entries(this.props.schema).reduce((acc, [field, schema]) => ({
      ...acc,
      [field]: schema.validate.label(schema.label)
    }), {}));
  }

  toggle = () => {
    this.setState(({ isOpened }) => ({ isOpened: !isOpened, previewSettingActive: null }));
  }

  selectSetting = (setting) => {
    this.setState(addField(setting, this.validator, this.props.onFormValidityUpdate));
  }

  unSelectSetting = (setting) => {
    this.setState(removeField(setting, this.props.onFormValidityUpdate));
  }

  isSettingSelected = setting => typeof this.state.fields[setting] !== 'undefined'

  setPreviewSettingActive = (previewSettingActive) => {
    this.setState({ previewSettingActive });
  }

  validateFields = (fields) => {
    const { onFormValidityUpdate } = this.props;
    const errors = {};

    let error;
    Object.entries(fields).forEach(([field, value]) => {
      ({ error } = this.validator.validate({ [field]: value }));

      errors[field] = parseError(error);
    });

    this.setState(updateFormErrors(errors, onFormValidityUpdate));
  }

  onFieldChange = (fields) => {
    this.setState(updateFields(fields));
    this.validateFields(fields);
  }

  renderRowSelectedSetting = (field, value, fieldSchema, areErrorsVisible, fieldErrors) => {
    const hasError = !!fieldErrors;
    const isInvalid = hasError &&  (fieldErrors.alwaysVisible || areErrorsVisible);

    return (
      <EuiDescribedFormGroup
        title={(
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h4>{fieldSchema.label}</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                color="danger"
                onClick={() => this.unSelectSetting(field)}
                iconType="minusInCircle"
                aria-label="Remove setting"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        description={fieldSchema.description}
        fullWidth
        key={field}
      >
        <EuiFormRow
          label={fieldSchema.label}
          error={fieldErrors && fieldErrors.message}
          isInvalid={isInvalid}
          fullWidth
        >
          <EuiFieldText
            isInvalid={isInvalid}
            value={value}
            onChange={e => this.onFieldChange({ [field]: e.target.value })}
            fullWidth
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  renderSelectedSettings = () => {
    const { fields, fieldsErrors } = this.state;
    const { areErrorsVisible, schema } = this.props;
    return Object.keys(fields).map((field) => (
      this.renderRowSelectedSetting(field, fields[field], schema[field], areErrorsVisible, fieldsErrors[field])
    ));
  }

  renderSettings = () => {
    const { schema } = this.props;
    const { previewSettingActive } = this.state;

    return (
      <Fragment>
        <EuiPanel paddingSize="m">
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              { Object.keys(schema)
                .filter((setting) => !this.isSettingSelected(setting))
                .map((field, i, arr) => {
                  const fieldSchema = schema[field];

                  return (
                    <Fragment key={field}>
                      <EuiFlexGroup
                        responsive={false}
                        style={{ flexGrow: 0 }}
                        onMouseEnter={() => this.setPreviewSettingActive(field)}
                        onMouseLeave={() => this.setPreviewSettingActive(null)}
                      >
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            color="success"
                            onClick={() => this.selectSetting(field)}
                            iconType="plusInCircle"
                            aria-label="Add setting"
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiLink
                            onClick={() => this.setPreviewSettingActive(field)}
                          >
                            {fieldSchema.label}
                          </EuiLink>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      {i < arr.length - 1 && <EuiSpacer size="s"/>}
                    </Fragment>
                  );
                }) }
            </EuiFlexItem>
            <EuiFlexItem>
              {previewSettingActive && (
                <Fragment>
                  <EuiTitle size="xs">
                    <h4>{schema[previewSettingActive].label}</h4>
                  </EuiTitle>
                  <EuiText>
                    {schema[previewSettingActive].description}
                  </EuiText>
                </Fragment>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </Fragment>
    );
  }

  render() {
    const { isOpened } = this.state;
    return (
      <Fragment>
        {this.renderSelectedSettings()}
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {!isOpened && (
              <EuiButtonEmpty
                iconType="plusInCircle"
                flush="left"
                onClick={this.toggle}
              >
                <FormattedMessage
                  id="xpack.todo"
                  defaultMessage="Add advanced setting"
                />
              </EuiButtonEmpty>
            )}
            {isOpened && (
              <EuiButtonEmpty
                iconType="cross"
                flush="left"
                onClick={this.toggle}
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexDetailPanel.closeButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        {isOpened && this.renderSettings()}
      </Fragment>
    );
  }
}
