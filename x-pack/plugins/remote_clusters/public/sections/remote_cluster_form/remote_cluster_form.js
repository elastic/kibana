/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { merge } from 'lodash';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLoadingKibana,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import {
  isSeedNodeValid,
  isSeedNodePortValid,
} from '../../services';

const defaultFields = {
  name: '',
  seeds: [],
  skipUnavailable: false,
};

const skipUnavailableOptions = [
  {
    id: 'skipUnavailableOptionFalse',
    label: (
      <FormattedMessage
        id="xpack.remoteClusters.remoteClusterForm.fieldSkipUnavailable.falseOptionLabel"
        defaultMessage="No"
      />
    ),
  }, {
    id: 'skipUnavailableOptionTrue',
    label: (
      <FormattedMessage
        id="xpack.remoteClusters.remoteClusterForm.fieldSkipUnavailable.trueOptionLabel"
        defaultMessage="Yes"
      />
    ),
  },
];

const skipUnavailableOptionIdToValueMap = {
  skipUnavailableOptionFalse: false,
  skipUnavailableOptionTrue: true,
};

const skipUnavailableOptionValueToIdMap = {
  [false]: 'skipUnavailableOptionFalse',
  [true]: 'skipUnavailableOptionTrue',
};

export class RemoteClusterFormUi extends Component {
  static propTypes = {
    save: PropTypes.func.isRequired,
    cancel: PropTypes.func,
    isSaving: PropTypes.bool,
    saveError: PropTypes.object,
    fields: PropTypes.object,
    disabledFields: PropTypes.object,
  }

  static defaultProps = {
    fields: merge({}, defaultFields),
    disabledFields: {},
  }

  constructor(props) {
    super(props);

    const { fields, disabledFields } = props;
    const fieldsState = merge({}, defaultFields, fields);

    this.state = {
      localSeedErrors: [],
      fields: fieldsState,
      disabledFields,
      fieldsErrors: this.getFieldsErrors(fieldsState),
      areErrorsVisible: false,
    };
  }

  getFieldsErrors(fields) {
    const { name, seeds } = fields;

    const errors = {};

    if (!name || !name.trim()) {
      errors.name = (
        <FormattedMessage
          id="xpack.remoteClusters.form.errors.nameMissing"
          defaultMessage="Name is required."
        />
      );
    }

    if (!seeds.some(seed => Boolean(seed.trim()))) {
      errors.seeds = (
        <FormattedMessage
          id="xpack.remoteClusters.form.errors.seedMissing"
          defaultMessage="At least one seed is required."
        />
      );
    }

    return errors;
  }

  onFieldsChange = (changedFields) => {
    const { fields: prevFields } = this.state;

    const newFields = {
      ...prevFields,
      ...changedFields,
    };

    this.setState({
      fields: newFields,
      fieldsErrors: this.getFieldsErrors(newFields),
      areErrorsVisible: false,
    });
  };

  getAllFields() {
    const {
      fields: {
        name,
        seeds,
        skipUnavailable,
      },
    } = this.state;

    return {
      name,
      seeds,
      skipUnavailable,
    };
  }

  save = () => {
    const { save } = this.props;
    const { fieldsErrors } = this.state;

    if (Object.keys(fieldsErrors).length > 0) {
      this.setState({
        areErrorsVisible: true,
      });
      return;
    }

    const cluster = this.getAllFields();

    save(cluster);
  };

  getLocalSeedErrors = (seedNode) => {
    const { intl } = this.props;

    const errors = [];

    const isInvalid = !isSeedNodeValid(seedNode);

    if (isInvalid) {
      errors.push(intl.formatMessage({
        id: 'xpack.remoteClusters.remoteClusterForm.localSeedError.invalidCharactersMessage',
        defaultMessage: `Seed nodes must consist of valid characters, with optional parts separated
        by periods. Valid characters are lowercase letters, numbers, and dashes.`,
      }));
    }

    const isPortInvalid = !isSeedNodePortValid(seedNode);

    if (isPortInvalid) {
      errors.push(intl.formatMessage({
        id: 'xpack.remoteClusters.remoteClusterForm.localSeedError.invalidPortMessage',
        defaultMessage: 'Seed node must define a numeric port.',
      }));
    }

    return errors;
  };

  onCreateSeed = (newSeed) => {
    const localSeedErrors = this.getLocalSeedErrors(newSeed);

    if (localSeedErrors.length !== 0) {
      this.setState({
        localSeedErrors,
      });

      // Return false to explicitly reject the user's input.
      return false;
    }

    const {
      fields: {
        seeds,
      },
    } = this.state;

    const newSeeds = seeds.slice(0);
    newSeeds.push(newSeed.toLowerCase());
    this.onFieldsChange({ seeds: newSeeds });
  };

  onSeedsInputChange = (seedInput) => {
    const { intl } = this.props;

    const {
      fields: {
        seeds,
      },
      localSeedErrors,
    } = this.state;

    // Allow typing to clear the errors, but not to add new ones.
    const errors = (!seedInput || this.getLocalSeedErrors(seedInput).length === 0) ? [] : localSeedErrors;

    // EuiComboBox internally checks for duplicates and prevents calling onCreateOption if the
    // input is a duplicate. So we need to surface this error here instead.
    const isDuplicate = seeds.includes(seedInput);

    if (isDuplicate) {
      errors.push(intl.formatMessage({
        id: 'xpack.remoteClusters.remoteClusterForm.localSeedError.duplicateMessage',
        defaultMessage: `Duplicate seed nodes aren't allowed.`,
      }));
    }

    this.setState({
      localSeedErrors: errors,
    });
  };

  onSeedsChange = (seeds) => {
    this.onFieldsChange({ seeds: seeds.map(({ label }) => label) });
  };

  clearCurrentFields = () => {
    const {
      disabledFields,
      fields,
    } = this.props;

    const newFields = Object.keys(fields).reduce((accumulator, fieldName) => {
      // Only clear fields which the user can edit.
      if (!disabledFields[fieldName]) {
        accumulator[fieldName] = defaultFields[fieldName];
      }

      return accumulator;
    }, {});

    this.onFieldsChange(newFields);
  };

  renderSeeds() {
    const {
      areErrorsVisible,
      fields: {
        seeds,
      },
      fieldsErrors: {
        seeds: errorsSeeds,
      },
      localSeedErrors,
    } = this.state;

    const { intl } = this.props;

    // Show errors if there is a general form error or local errors.
    const areFormErrorsVisible = Boolean(areErrorsVisible && errorsSeeds);
    const showErrors = areFormErrorsVisible || localSeedErrors.length !== 0;
    const errors = areFormErrorsVisible ? localSeedErrors.concat(errorsSeeds) : localSeedErrors;

    const formattedSeeds = seeds.map(seed => ({ label: seed }));

    return (
      <EuiDescribedFormGroup
        title={(
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSeedsTitle"
                defaultMessage="Seed nodes"
              />
            </h4>
          </EuiTitle>
        )}
        description={(
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSeedsDescription1"
                defaultMessage="When connecting to this remote cluster, its cluster state will be
                retrieved from one of its seed nodes so that by default up to three gateway nodes
                are selected to be connected to as part of remote cluster requests."
              />
            </p>

            <p>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSeedsDescription2"
                defaultMessage="Seed nodes can be defined as IP addresses or host names, but they
                must contain a port."
              />
            </p>
          </Fragment>
        )}
        fullWidth
      >
        <EuiFormRow
          label={(
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldSeedsLabel"
              defaultMessage="IP addresses or hostnames"
            />
          )}
          isInvalid={showErrors}
          error={errors}
          fullWidth
        >
          <EuiComboBox
            noSuggestions
            placeholder={intl.formatMessage({
              id: 'xpack.remoteClusters.remoteClusterForm.fieldSeedsPlaceholder',
              defaultMessage: 'Type and then hit ENTER',
            })}
            selectedOptions={formattedSeeds}
            onCreateOption={this.onCreateSeed}
            onChange={this.onSeedsChange}
            onSearchChange={this.onSeedsInputChange}
            isInvalid={showErrors}
            fullWidth
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  onSkipUnavailableChange = (skipUnavailableOptionId) => {
    const skipUnavailable = skipUnavailableOptionIdToValueMap[skipUnavailableOptionId];
    this.onFieldsChange({ skipUnavailable });
  };

  renderSkipUnavailable() {
    const {
      fields: {
        skipUnavailable,
      },
    } = this.state;

    const selectedOptionId = skipUnavailableOptionValueToIdMap[skipUnavailable];

    return (
      <EuiDescribedFormGroup
        title={(
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableTitle"
                defaultMessage="Skip unavailable"
              />
            </h4>
          </EuiTitle>
        )}
        description={(
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableDescription"
                defaultMessage="Per cluster boolean setting that allows to skip specific clusters
                  when no nodes belonging to them are available and they are the target of a remote
                  cluster request. Default is false, meaning that all clusters are mandatory by default,
                  but they can selectively be made optional by setting this setting to true."
              />
            </p>
          </Fragment>
        )}
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace
          fullWidth
        >
          <EuiRadioGroup
            options={skipUnavailableOptions}
            idSelected={selectedOptionId}
            onChange={this.onSkipUnavailableChange}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  renderActions() {
    const { isSaving, cancel } = this.props;

    if (isSaving) {
      return (
        <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l"/>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.actions.savingText"
                defaultMessage="Saving"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    let cancelButton;

    if (cancel) {
      cancelButton = (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="primary"
            onClick={cancel}
          >
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      );
    }

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                color="secondary"
                iconType="check"
                onClick={this.save}
                fill
              >
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>

            {cancelButton}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="right" onClick={this.clearCurrentFields}>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.resetFormButton"
              defaultMessage="Reset to defaults"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  renderSavingFeedback() {
    if (this.props.isSaving) {
      return (
        <EuiOverlayMask>
          <EuiLoadingKibana size="xl"/>
        </EuiOverlayMask>
      );
    }

    return null;
  }

  renderSaveErrorFeedback() {
    const { saveError } = this.props;

    if (saveError) {
      const { message, cause } = saveError;

      let errorBody;

      if (cause) {
        if (cause.length === 1) {
          errorBody = (
            <p>{cause[0]}</p>
          );
        } else {
          errorBody = (
            <ul>
              {cause.map(causeValue => <li key={causeValue}>{causeValue}</li>)}
            </ul>
          );
        }
      }

      return (
        <Fragment>
          <EuiCallOut
            title={message}
            icon="cross"
            color="danger"
          >
            {errorBody}
          </EuiCallOut>

          <EuiSpacer />
        </Fragment>
      );
    }

    return null;
  }

  renderErrors = () => {
    const { areErrorsVisible, fieldsErrors } = this.state;
    const errorValues = Object.values(fieldsErrors);
    const hasErrors = errorValues.some(error => error !== undefined);

    if (!areErrorsVisible || !hasErrors) {
      return null;
    }

    return (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={(
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.errorTitle"
              defaultMessage="Fix errors before saving."
            />
          )}
          color="danger"
          iconType="cross"
        />
      </Fragment>
    );
  }

  render() {
    const {
      disabledFields: {
        name: disabledName,
      },
    } = this.props;

    const {
      areErrorsVisible,
      fields: {
        name,
      },
      fieldsErrors: {
        name: errorClusterName,
      },
    } = this.state;

    return (
      <Fragment>
        {this.renderSaveErrorFeedback()}

        <EuiForm>
          <EuiDescribedFormGroup
            title={(
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.sectionNameTitle"
                    defaultMessage="Remote cluster name"
                  />
                </h4>
              </EuiTitle>
            )}
            description={(
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionNameDescription"
                defaultMessage="This is the name of the remote cluster you want to connect to."
              />
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.fieldNameLabel"
                  defaultMessage="Remote cluster name"
                />
              )}
              error={errorClusterName}
              isInvalid={Boolean(areErrorsVisible && errorClusterName)}
              fullWidth
            >
              <EuiFieldText
                isInvalid={Boolean(areErrorsVisible && errorClusterName)}
                value={name}
                onChange={e => this.onFieldsChange({ name: e.target.value })}
                fullWidth
                disabled={disabledName}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          {this.renderSeeds()}

          {this.renderSkipUnavailable()}
        </EuiForm>

        {this.renderErrors()}

        <EuiSpacer size="l" />

        {this.renderActions()}

        {this.renderSavingFeedback()}
      </Fragment>
    );
  }
}

export const RemoteClusterForm = injectI18n(RemoteClusterFormUi);
