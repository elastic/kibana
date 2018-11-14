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

  onCreateOption = (searchValue) => {
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

    const showErrors = Boolean(areErrorsVisible && errorsSeeds);
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
          error={errorsSeeds}
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
