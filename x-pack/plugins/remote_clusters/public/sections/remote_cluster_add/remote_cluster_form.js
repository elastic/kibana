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

  getLocalSeedErrors = (value) => {
    const { intl } = this.props;
    const errors = [];

    const ipParts = value.split('.');
    const isRangeInvalid = ipParts.some(part => isNaN(part) || Number(part) < 0 || Number(part) > 255);

    if (ipParts.length !== 4 || isRangeInvalid) {
      errors.push(intl.formatMessage({
        id: "xpack.remoteClusters.remoteClusterForm.localSeedError.invalidIpMessage",
        defaultMessage: "IP adresses must consist of four numbers between 0 and 255, separated by periods.",
      }));
    }

    // Check for non-digits and non-periods.
    if (value.match(/[^\d\.]*/)[0].length !== 0) {
      errors.push(intl.formatMessage({
        id: "xpack.remoteClusters.remoteClusterForm.localSeedError.invalidCharactersMessage",
        defaultMessage: "Only numbers and periods are allowed in the IP address.",
      }));
    }

    return errors;
  };

  onCreateOption = (searchValue) => {
    const {
      onFieldsChange,
      fields: {
        seeds,
      },
    } = this.props;

    const localSeedErrors = this.getLocalSeedErrors(searchValue);

    if (localSeedErrors.length !== 0) {
      this.setState({
        localSeedErrors,
      });

      // Return false to explicitly reject the user's input.
      return false;
    }

    const newSeeds = seeds.slice(0);
    newSeeds.push(searchValue);
    onFieldsChange({ seeds: newSeeds });
  };

  onSearchChange = (searchValue) => {
    // Allow typing to clear the errors, but not to add new ones.
    if (!searchValue || this.getLocalSeedErrors(searchValue).length === 0) {
      this.setState({
        localSeedErrors: [],
      });
    }
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
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.sectionSeedsDescription"
            defaultMessage="COPY NEEDED"
          />
        )}
        fullWidth
      >
        <EuiFormRow
          label={(
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldSeedsLabel"
              defaultMessage="IP addresses"
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
              defaultMessage: 'Type an IP address and hit ENTER',
            })}
            selectedOptions={formattedSeeds}
            onCreateOption={this.onCreateOption}
            onChange={this.onChange}
            onSearchChange={this.onSearchChange}
            isInvalid={showErrors}
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
