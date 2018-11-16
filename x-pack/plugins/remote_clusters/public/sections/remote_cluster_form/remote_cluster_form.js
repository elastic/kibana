/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import cloneDeep from 'lodash/lang/cloneDeep';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
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
};

export class RemoteClusterFormUi extends Component {
  static propTypes = {
    save: PropTypes.func,
    isSaving: PropTypes.bool,
    saveError: PropTypes.object,
    fields: PropTypes.object,
  }

  static defaultProps = {
    fields: cloneDeep(defaultFields),
  }

  constructor(props) {
    super(props);

    const { fields } = props;

    this.state = {
      localSeedErrors: [],
      fields,
      fieldsErrors: this.getFieldsErrors(fields),
      areErrorsVisible: false,
    };
  }

  getFieldsErrors(fields) {
    const { name, seeds } = fields;

    const errors = {};

    if (!name || !name.trim()) {
      errors.name = (
        <FormattedMessage
          id="xpack.remoteClusters.add.errors.nameMissing"
          defaultMessage="Name is required."
        />
      );
    }

    if (!seeds.some(seed => Boolean(seed.trim()))) {
      errors.seeds = (
        <FormattedMessage
          id="xpack.remoteClusters.add.errors.seedMissing"
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
    });
  };

  getAllFields() {
    const {
      fields: {
        name,
        seeds,
      },
    } = this.state;

    return {
      name: name,
      seeds,
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

  renderActions() {
    const { isSaving } = this.props;

    if (isSaving) {
      return (
        <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l"/>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText>
              <FormattedMessage
                id="xpack.remoteClusters.add.actions.savingText"
                defaultMessage="Saving"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiButton
        color="secondary"
        iconType="check"
        onClick={this.save}
        fill
      >
        <FormattedMessage
          id="xpack.remoteClusters.add.saveButtonLabel"
          defaultMessage="Save"
        />
      </EuiButton>
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

  render() {
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
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          {this.renderSeeds()}
        </EuiForm>

        <EuiSpacer size="l" />

        {this.renderActions()}
        {this.renderSavingFeedback()}
      </Fragment>
    );
  }
}

export const RemoteClusterForm = injectI18n(RemoteClusterFormUi);
