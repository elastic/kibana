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
  EuiPanel,
  EuiButtonIcon,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { FormEntryRow } from './form_entry_row';
import { getValidator } from '../services/input_validation';

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
export const addField = (field) => ({ fields }) => ({
  fields: {
    ...fields,
    [field]: '',
  },
  previewSettingActive: null
});

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

  onFieldChange = (fields) => {
    this.setState(updateFields(fields));
  }

  onFieldsErrorChange = (errors) => {
    this.setState(updateFormErrors(errors, this.props.onFormValidityUpdate));
  }

  renderSelectedSettings = () => {
    const { fields } = this.state;
    const { areErrorsVisible, schema } = this.props;

    return Object.keys(fields).map((field) => (
      <FormEntryRow
        key={field}
        field={field}
        schema={schema[field]}
        areErrorsVisible={areErrorsVisible}
        validator={this.validator}
        onValueUpdate={this.onFieldChange}
        onErrorUpdate={this.onFieldsErrorChange}
        onRemoveRow={this.unSelectSetting}
      />
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
