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

const validateField = (/* field */) => null;

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
 * State transitions: add setting field to form and errors
 */
export const addSetting = (setting) => ({ fields, fieldsErrors }) => ({
  fields: {
    ...fields,
    [setting]: '',
  },
  fieldsErrors: {
    ...fieldsErrors,
    [setting]: validateField(setting)
  },
  previewSettingActive: null
});

/**
 * State transitions: remove setting from fields and errors
 */
export const removeSetting = (setting) => ({ fields, fieldsErrors }) => {
  const { [setting]: value, ...fieldsWithoutSetting } = fields; // eslint-disable-line no-unused-vars
  const { [setting]: value2, ...fieldsErrorsWithoutSetting } = fieldsErrors; // eslint-disable-line no-unused-vars
  return {
    fields: fieldsWithoutSetting,
    fieldsErrors: fieldsErrorsWithoutSetting,
  };
};

export class AdvancedSettingsForm extends PureComponent {
  static propTypes = {
    areErrorsVisible: PropTypes.bool.isRequired,
    schema: PropTypes.object.isRequired
  }

  state = {
    isOpened: false,
    fields: {},
    fieldsErrors: {},
    previewSettingActive: null,
  };

  toggle = () => {
    this.setState(({ isOpened }) => ({ isOpened: !isOpened, previewSettingActive: null }));
  }

  selectSetting = (setting) => {
    this.setState(addSetting(setting));
  }

  unSelectSetting = (setting) => {
    this.setState(removeSetting(setting));
  }

  getSettingSelection = (checkIsSelected = true) => (setting) => checkIsSelected
    ? typeof this.state.fields[setting] !== 'undefined'
    : typeof this.state.fields[setting] === 'undefined'

  setPreviewSettingActive = (previewSettingActive) => {
    this.setState({ previewSettingActive });
  }

  onFieldChange = (fields) => {
    this.setState(updateFields(fields));
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
                .filter(this.getSettingSelection(false))
                .map((field, i, arr) => {
                  const fieldSchema = schema[field];

                  return (
                    <Fragment key={field}>
                      <EuiFlexGroup responsive={false} style={{ flexGrow: 0 }}>
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
                            onMouseEnter={() => this.setPreviewSettingActive(field)}
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
