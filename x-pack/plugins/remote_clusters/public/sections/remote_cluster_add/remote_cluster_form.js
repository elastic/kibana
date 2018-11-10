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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormLabel,
  EuiFormRow,
  EuiFormErrorText,
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

  addSeed = () => {
    const {
      onFieldsChange,
      fields: {
        seeds,
      },
    } = this.props;

    const newSeeds = seeds.slice(0);
    newSeeds.push('');
    onFieldsChange({ seeds: newSeeds });
  };

  removeSeedAtIndex = index => {
    const {
      onFieldsChange,
      fields: {
        seeds,
      },
    } = this.props;

    const newSeeds = seeds.slice(0);
    newSeeds.splice(index, 1);
    onFieldsChange({ seeds: newSeeds });
  };

  updateSeedAtIndex = (index, value) => {
    const {
      onFieldsChange,
      fields: {
        seeds,
      },
    } = this.props;

    const newSeeds = seeds.slice(0);
    newSeeds[index] = value;
    onFieldsChange({ seeds: newSeeds });
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

    const seedInputs = seeds.map((seed, index) => {
      const field = (
        <EuiFieldText
          value={seed}
          onChange={e => this.updateSeedAtIndex(index, e.target.value)}
          fullWidth
          aria-labelledby="remoteClusterFormSeeds"
        />
      );

      let wrappedField;

      if (index === 0) {
        wrappedField = field;
      } else {
        wrappedField = (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem>
              {field}
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                color="danger"
                onClick={() => this.removeSeedAtIndex(index)}
                iconType="trash"
                aria-label={intl.formatMessage({
                  id: 'xpack.remoteClusters.add.form.remoteSeedAriaLabel',
                  defaultMessage: 'Remove {ipAddress}',
                }, { ipAddress: seed })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }

      return (
        <Fragment key={index}>
          {wrappedField}
          <EuiSpacer size="s" />
        </Fragment>
      );
    });

    let error;

    if (areErrorsVisible && errorsSeeds) {
      error = (
        <EuiFormErrorText>
          {errorsSeeds}
        </EuiFormErrorText>
      );
    }

    return (
      <EuiDescribedFormGroup
        title={(
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.remoteClusters.add.form.sectionSeedsTitle"
                defaultMessage="Seed nodes"
              />
            </h4>
          </EuiTitle>
        )}
        description={(
          <FormattedMessage
            id="xpack.remoteClusters.add.form.sectionSeedsDescription"
            defaultMessage="COPY NEEDED"
          />
        )}
        fullWidth
      >
        <EuiFormLabel id="remoteClusterFormSeeds">
          <FormattedMessage
            id="xpack.remoteClusters.add.form.fieldSeedsLabel"
            defaultMessage="IP addresses"
          />
        </EuiFormLabel>

        {seedInputs}

        {/* This div lets the button break out of the flexbox layout created by EuiFormRow. */}
        <div>
          <EuiButtonEmpty flush="left" iconType="plusInCircle" onClick={this.addSeed}>
            <FormattedMessage
              id="xpack.remoteClusters.add.form.addSeedButtonLabel"
              defaultMessage="Add seed"
            />
          </EuiButtonEmpty>
        </div>

        {error}
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
                    id="xpack.remoteClusters.add.form.sectionNameTitle"
                    defaultMessage="Remote cluster name"
                  />
                </h4>
              </EuiTitle>
            )}
            description={(
              <FormattedMessage
                id="xpack.remoteClusters.add.form.sectionNameDescription"
                defaultMessage="This is the name of the remote cluster you want to connect to."
              />
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.remoteClusters.add.form.fieldNameLabel"
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
