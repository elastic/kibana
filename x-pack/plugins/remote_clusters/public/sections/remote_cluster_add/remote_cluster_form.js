/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
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

export class RemoteClusterFormUi extends Component {
  static propTypes = {
    save: PropTypes.func,
    isSaving: PropTypes.bool,
    saveError: PropTypes.node,
    areErrorsVisible: PropTypes.bool,
    fields: PropTypes.object,
    fieldsErrors: PropTypes.object,
    onFieldsChange: PropTypes.func,
  }

  constructor(props) {
    super(props);

    this.state = {
      localSeedErrors: [],
    };
  }

  renderActions() {
    const { isSaving, save } = this.props;

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
        onClick={save}
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
    if (this.props.isAddingRemoteCluster) {
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

  getLocalSeedErrors = (seedNode) => {
    const { intl } = this.props;

    const errors = [];

    const isInvalid = !isSeedNodeValid(seedNode);

    if (isInvalid) {
      errors.push(intl.formatMessage({
        id: 'xpack.remoteClusters.remoteClusterForm.localSeedError.invalidCharactersMessage',
        defaultMessage: `Seed nodes must consist of valid characters, optionally separated by
        periods. Valid characters are lowercase letters, numbers, underscores, and dashes.`,
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

  onCreateOption = (searchValue) => {
    const localSeedErrors = this.getLocalSeedErrors(searchValue);

    if (localSeedErrors.length !== 0) {
      this.setState({
        localSeedErrors,
      });

      // Return false to explicitly reject the user's input.
      return false;
    }

    const {
      onFieldsChange,
      fields: {
        seeds,
      },
    } = this.props;

    const newSeeds = seeds.slice(0);
    newSeeds.push(searchValue);
    onFieldsChange({ seeds: newSeeds });
  };

  onSearchChange = (searchValue) => {
    const {
      fields: {
        seeds,
      },
      intl,
    } = this.props;

    const localSeedErrors = this.getLocalSeedErrors(searchValue);

    // Allow typing to clear the errors, but not to add new ones.
    const errors = (!searchValue || localSeedErrors.length === 0) ? [] : localSeedErrors;

    // EuiComboBox internally checks for duplicates and prevents calling onCreateOption if the
    // input is a duplicate. So we need to surface this error here instead.
    const isDuplicate = seeds.includes(searchValue);

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

  onChange = (selectedOptions) => {
    const { onFieldsChange } = this.props;
    onFieldsChange({ seeds: selectedOptions.map(({ label }) => label) });
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
      intl,
    } = this.props;

    const { localSeedErrors } = this.state;

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
            onCreateOption={this.onCreateOption}
            onChange={this.onChange}
            onSearchChange={this.onSearchChange}
            isInvalid={showErrors}
            fullWidth
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  render() {
    const {
      areErrorsVisible,
      fields: {
        remoteClusterName,
      },
      fieldsErrors: {
        remoteClusterName: errorRemoteClusterName,
      },
      onFieldsChange,
    } = this.props;

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
              error={errorRemoteClusterName}
              isInvalid={Boolean(areErrorsVisible && errorRemoteClusterName)}
              fullWidth
            >
              <EuiFieldText
                isInvalid={Boolean(areErrorsVisible && errorRemoteClusterName)}
                value={remoteClusterName}
                onChange={e => onFieldsChange({ remoteClusterName: e.target.value })}
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
