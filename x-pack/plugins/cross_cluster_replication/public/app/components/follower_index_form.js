/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { debounce } from 'lodash';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
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
  EuiSuperSelect,
} from '@elastic/eui';

import Joi from 'joi';

import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';

import routing from '../services/routing';
import { API_STATUS } from '../constants';
import { SectionError } from './section_error';
import { AdvancedSettingsForm } from './advanced_settings_form';
import { validateFollowerIndex } from '../services/follower_index_validators';
import { loadIndices } from '../services/api';

const indexNameIllegalCharacters = INDEX_ILLEGAL_CHARACTERS_VISIBLE.join(' ');

const getFirstConnectedCluster = (clusters) => {
  for (let i = 0; i < clusters.length; i++) {
    if (clusters[i].isConnected) {
      return clusters[i];
    }
  }
  return {};
};

const getEmptyFollowerIndex = (remoteClusters) => ({
  name: '',
  remoteCluster: getFirstConnectedCluster(remoteClusters).name,
  leaderIndex: '',
});

/**
 * State transitions: fields update
 */
export const updateFields = (fields) => ({ followerIndex }) => ({
  followerIndex: {
    ...followerIndex,
    ...fields,
  },
});

/**
 * State transitions: errors update
 */
export const updateFormErrors = (errors) => ({ fieldsErrors }) => ({
  fieldsErrors: {
    ...fieldsErrors,
    ...errors,
  }
});

/* eslint-disable */
const schemaAdvancedFields = {
  maxReadRequestOperationCount: {
    label: 'Max read request operation count',
    description: 'The maximum number of operations to pull per read from the remote cluster.',
    validate: Joi.number(),
  },
  maxOutstandingReadRequests: {
    label: 'Max outstanding read requests',
    description: 'The maximum number of outstanding reads requests from the remote cluster.',
    validate: Joi.number(),
  },
  maxReadRequestSize: {
    label: 'Max read request size',
    description: 'The maximum size in bytes of per read of a batch of operations pulled from the remote cluster (bye value).',
    validate: Joi.number(),
  },
  maxWriteRequestOperationCount: {
    label: 'Max write request operation count',
    description: 'The maximum number of operations per bulk write request executed on the follower.',
    validate: Joi.number(),
  },
  maxWriteRequestSize: {
    label: 'Max write request size',
    description: 'The maximum total bytes of operations per bulk write request executed on the follower.',
    validate: Joi.number(),
  },
  maxOutstandingWriteRequests: {
    label: 'Max outstanding write requests',
    description: 'The maximum number of outstanding write requests on the follower.',
    validate: Joi.number(),
  },
  maxWriteBufferCount: {
    label: 'Max write buffer count',
    description: 'The maximum number of operations that can be queued for writing; when this limit is reached, reads from the remote cluster will be deferred until the number of queued operations goes below the limit.',
    validate: Joi.number(),
  },
  maxWriteBufferSize: {
    label: 'Max write buffer size',
    description: 'The maximum total bytes of operations that can be queued for writing; when this limit is reached, reads from the remote cluster will be deferred until the total bytes of queued operations goes below the limit.',
    validate: Joi.number(),
  },
  maxRetryDelay: {
    label: 'Max retry delay',
    description: 'The maximum time to wait before retrying an operation that failed exceptionally; an exponential backoff strategy is employed when retrying.',
    validate: Joi.number(),
  },
  readPollTimeout: {
    label: 'Read poll timeout',
    description: 'The maximum time to wait for new operations on the remote cluster when the follower index is synchronized with the leader index; when the timeout has elapsed, the poll for operations will return to the follower so that it can update some statistics, and then the follower will immediately attempt to read from the leader again.',
    validate: Joi.number(),
  },
};
/* eslint-enable */

export const FollowerIndexForm = injectI18n(
  class extends PureComponent {
    static propTypes = {
      saveFollowerIndex: PropTypes.func.isRequired,
      clearApiError: PropTypes.func.isRequired,
      followerIndex: PropTypes.object,
      apiError: PropTypes.object,
      apiStatus: PropTypes.string.isRequired,
      remoteClusters: PropTypes.array.isRequired,
    }

    constructor(props) {
      super(props);

      const isNew = this.props.followerIndex === undefined;

      const followerIndex = isNew
        ? getEmptyFollowerIndex(this.props.remoteClusters)
        : {
          ...this.props.followerIndex,
        };

      this.state = {
        followerIndex,
        fieldsErrors: validateFollowerIndex(followerIndex),
        advancedSettingsFormValid: true,
        areErrorsVisible: false,
        isNew,
      };

      this.validateIndexName = debounce(this.validateIndexName, 500);
    }

    onFieldsChange = (fields) => {
      const errors = validateFollowerIndex(fields);
      this.setState(updateFields(fields));
      this.setState(updateFormErrors(errors));

      if (this.props.apiError) {
        this.props.clearApiError();
      }
    };

    onClusterChange = (remoteCluster) => {
      this.onFieldsChange({ remoteCluster });
    };

    updateAdvancedSettingsFormValidity = (isValid) => this.setState({ advancedSettingsFormValid: isValid })

    getFields = () => {
      return this.state.followerIndex;
    };

    isFormValid() {
      return Object.values(this.state.fieldsErrors).every(error => error === null) && this.state.advancedSettingsFormValid;
    }

    sendForm = () => {
      const isFormValid = this.isFormValid();

      this.setState({ areErrorsVisible: !isFormValid });

      if (!isFormValid) {
        return;
      }

      const { name, ...followerIndex } = this.getFields();

      this.props.saveFollowerIndex(name, followerIndex);
    };

    cancelForm = () => {
      routing.navigate('/follower_indices');
    };

    onIndexNameChange = (name) => {
      this.onFieldsChange({ name });
      this.validateIndexName(name);
    }

    validateIndexName = async (name) => {
      if (!name || !name.trim) {
        return;
      }

      const { intl } = this.props;

      try {
        const indices = await loadIndices();
        const doesExist = indices.some(index => index.name === name);
        if (doesExist) {
          const message = intl.formatMessage({
            id: 'xpack.crossClusterReplication.followerIndexForm.indexAlreadyExistError',
            defaultMessage: 'An index with the same name already exists.'
          });
          this.setState(updateFormErrors({ name: { message, alwaysVisible: true } }));
        }
      } catch (err) {
        // Silently fail...
      }
    }

    /**
     * Secctions Renders
     */
    renderApiErrors() {
      const { apiError, intl } = this.props;

      if (apiError) {
        const title = intl.formatMessage({
          id: 'xpack.crossClusterReplication.followerIndexForm.savingErrorTitle',
          defaultMessage: 'Error creating follower index',
        });
        const { leaderIndex } = this.state.followerIndex;
        const error = apiError.status === 404
          ? {
            data: {
              message: intl.formatMessage({
                id: 'xpack.crossClusterReplication.followerIndexForm.leaderIndexNotFoundError',
                defaultMessage: `The leader index '{leaderIndex}' you want to replicate from does not exist.`,
              }, { leaderIndex })
            }
          }
          : apiError;
        return <SectionError title={title} error={error} />;
      }

      return null;
    }

    renderForm = () => {
      const {
        followerIndex: {
          name,
          remoteCluster,
          leaderIndex,
        },
        isNew,
        areErrorsVisible,
        fieldsErrors,
      } = this.state;

      /**
       * Follower index name
       */
      const renderFollowerIndexName = () => {
        const hasError = !!fieldsErrors.name;
        const isInvalid = hasError &&  (fieldsErrors.name.alwaysVisible || areErrorsVisible);

        return (
          <EuiDescribedFormGroup
            title={(
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.sectionFollowerIndexNameTitle"
                    defaultMessage="Name"
                  />
                </h4>
              </EuiTitle>
            )}
            description={(
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexForm.sectionFollowerIndexNameDescription"
                defaultMessage="A name for the follower index."
              />
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.followerIndexName.fieldNameLabel"
                  defaultMessage="Name"
                />
              )}
              helpText={(
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.indexNameHelpLabel"
                  defaultMessage="Spaces and the characters {characterList} are not allowed."
                  values={{ characterList: <strong>{indexNameIllegalCharacters}</strong> }}
                />
              )}
              error={fieldsErrors.name && fieldsErrors.name.message}
              isInvalid={isInvalid}
              fullWidth
            >
              <EuiFieldText
                isInvalid={isInvalid}
                value={name}
                onChange={e => this.onIndexNameChange(e.target.value)}
                fullWidth
                disabled={!isNew}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        );
      };

      /**
       * Remote Cluster
       */
      const renderRemoteClusterField = () => {
        const remoteClustersOptions = this.props.remoteClusters.map(({ name, isConnected }) => ({
          value: name,
          inputDisplay: isConnected ? name : `${name} (not connected)`,
          disabled: !isConnected,
          'data-test-subj': `option-${name}`
        }));

        return (
          <EuiDescribedFormGroup
            title={(
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.sectionRemoteClusterTitle"
                    defaultMessage="Remote cluster"
                  />
                </h4>
              </EuiTitle>
            )}
            description={(
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexForm.sectionRemoteClusterDescription"
                defaultMessage="The remote cluster to replicate your leader index from."
              />
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.remoteCluster.fieldClusterLabel"
                  defaultMessage="Remote cluster"
                />
              )}
              fullWidth
            >
              <Fragment>
                { isNew && (
                  <EuiSuperSelect
                    options={remoteClustersOptions}
                    valueOfSelected={remoteCluster}
                    onChange={this.onClusterChange}
                  />
                )}
                { !isNew && (
                  <EuiFieldText
                    value={remoteCluster}
                    fullWidth
                    disabled={true}
                  />
                )}
              </Fragment>
            </EuiFormRow>
          </EuiDescribedFormGroup>
        );
      };

      /**
       * Leader index
       */
      const renderLeaderIndex = () => {
        const hasError = !!fieldsErrors.leaderIndex;
        const isInvalid = hasError && areErrorsVisible;

        return (
          <EuiDescribedFormGroup
            title={(
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexTitle"
                    defaultMessage="Leader index"
                  />
                </h4>
              </EuiTitle>
            )}
            description={(
              <Fragment>
                <p>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexDescription1"
                    defaultMessage="The leader index you want to replicate from the remote cluster."
                  />
                </p>
              </Fragment>
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.fieldLeaderIndexLabel"
                  defaultMessage="Leader index"
                />
              )}
              helpText={(
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.indexNameHelpLabel"
                  defaultMessage="Spaces and the characters {characterList} are not allowed."
                  values={{ characterList: <strong>{indexNameIllegalCharacters}</strong> }}
                />
              )}
              isInvalid={isInvalid}
              error={fieldsErrors.leaderIndex && fieldsErrors.leaderIndex.message}
              fullWidth
            >
              <EuiFieldText
                isInvalid={isInvalid}
                value={leaderIndex}
                onChange={e => this.onFieldsChange({ leaderIndex: e.target.value })}
                fullWidth
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        );
      };

      /**
       * Form Error warning message
       */
      const renderFormErrorWarning = () => {
        const { areErrorsVisible } = this.state;
        const isFormValid = this.isFormValid();

        if (!areErrorsVisible || isFormValid) {
          return null;
        }

        return (
          <Fragment>
            <EuiSpacer size="m" />
            <EuiCallOut
              title={(
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.validationErrorTitle"
                  defaultMessage="Fix errors before continuing."
                />
              )}
              color="danger"
              iconType="cross"
            />
          </Fragment>
        );
      };

      /**
       * Form Actions
       */
      const renderActions = () => {
        const { apiStatus } = this.props;
        const { areErrorsVisible } = this.state;

        if (apiStatus === API_STATUS.SAVING) {
          return (
            <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l"/>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiText>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.actions.savingText"
                    defaultMessage="Saving"
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }

        const isSaveDisabled = areErrorsVisible && !this.isFormValid();

        return (
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                color="secondary"
                iconType="check"
                onClick={this.sendForm}
                fill
                disabled={isSaveDisabled}
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="primary"
                onClick={this.cancelForm}
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      };

      return (
        <Fragment>
          <EuiForm>
            {renderFollowerIndexName()}
            {renderRemoteClusterField()}
            {renderLeaderIndex()}
          </EuiForm>
          <EuiSpacer size="l" />
          <AdvancedSettingsForm
            areErrorsVisible={areErrorsVisible}
            schema={schemaAdvancedFields}
            onFormValidityUpdate={this.updateAdvancedSettingsFormValidity}
          />
          <EuiSpacer size="l" />
          {renderFormErrorWarning()}
          <EuiSpacer size="l" />
          {renderActions()}
        </Fragment>
      );
    }

    renderLoading = () => {
      const { apiStatus } = this.props;

      if (apiStatus === API_STATUS.SAVING) {
        return (
          <EuiOverlayMask>
            <EuiLoadingKibana size="xl"/>
          </EuiOverlayMask>
        );
      }
      return null;
    }

    render() {
      return (
        <Fragment>
          {this.renderApiErrors()}
          {this.renderForm()}
          {this.renderLoading()}
        </Fragment>
      );
    }
  }
);


