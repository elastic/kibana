/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';
import { i18n } from '@kbn/i18n';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';

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

import { indexNameValidator } from '../../services/input_validation';
import routing from '../../services/routing';
import { loadIndices } from '../../services/api';
import { API_STATUS } from '../../constants';
import { SectionError } from '../section_error';
import { FormEntryRow } from '../form_entry_row';
import { advancedSettingsFields, emptyAdvancedSettings } from './advanced_settings_fields';

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
  remoteCluster: remoteClusters ? getFirstConnectedCluster(remoteClusters).name : '',
  leaderIndex: '',
  ...emptyAdvancedSettings,
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
          ...getEmptyFollowerIndex(),
          ...this.props.followerIndex,
        };

      this.state = {
        isNew,
        followerIndex,
        fieldsErrors: {},
        areErrorsVisible: false,
        areAdvancedSettingsVisible: false,
      };

      this.validateIndexName = debounce(this.validateIndexName, 500);
    }

    onFieldsChange = (fields) => {
      this.setState(updateFields(fields));

      if (this.props.apiError) {
        this.props.clearApiError();
      }
    };

    onFieldsErrorChange = (errors) => {
      this.setState(updateFormErrors(errors));
    }

    onIndexNameChange = ({ name }) => {
      this.onFieldsChange({ name });
      this.validateIndexName(name);
    }

    validateIndexName = async (name) => {
      if (!name || !name.trim()) {
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

    onClusterChange = (remoteCluster) => {
      this.onFieldsChange({ remoteCluster });
    };

    getFields = () => {
      return this.state.followerIndex;
    };

    toggleAdvancedSettings = () => {
      this.setState(({ areAdvancedSettingsVisible }) => ({ areAdvancedSettingsVisible: !areAdvancedSettingsVisible }));
    }

    isFormValid() {
      return Object.values(this.state.fieldsErrors).every(error => error === null);
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
        followerIndex,
        isNew,
        areErrorsVisible,
        areAdvancedSettingsVisible,
        fieldsErrors,
      } = this.state;

      const toggleAdvancedSettingButtonLabel = areAdvancedSettingsVisible
        ? (
          <FormattedMessage
            id="xpack.crossClusterReplication.followerIndex.advancedSettingsForm.hideButtonLabel"
            defaultMessage="Hide advanced settings"
          />
        ) : (
          <FormattedMessage
            id="xpack.crossClusterReplication.followerIndex.advancedSettingsForm.showButtonLabel"
            defaultMessage="Show advanced settings"
          />
        );

      /**
       * Follower index name
       */
      const renderFollowerIndexName = () => (
        <FormEntryRow
          field="name"
          value={followerIndex.name}
          error={fieldsErrors.name}
          label={i18n.translate('xpack.crossClusterReplication.followerIndexForm.sectionFollowerIndexNameTitle', {
            defaultMessage: 'Name'
          })}
          description={i18n.translate('xpack.crossClusterReplication.followerIndexForm.sectionFollowerIndexNameDescription', {
            defaultMessage: 'A name for the follower index.'
          })}
          helpText={(
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexForm.indexNameHelpLabel"
              defaultMessage="Spaces and the characters {characterList} are not allowed."
              values={{ characterList: <strong>{indexNameIllegalCharacters}</strong> }}
            />
          )}
          validator={indexNameValidator}
          disabled={!isNew}
          areErrorsVisible={areErrorsVisible}
          onValueUpdate={this.onIndexNameChange}
          onErrorUpdate={this.onFieldsErrorChange}
        />
      );

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
                    valueOfSelected={followerIndex.remoteCluster}
                    onChange={this.onClusterChange}
                  />
                )}
                { !isNew && (
                  <EuiFieldText
                    value={followerIndex.remoteCluster}
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
      const renderLeaderIndex = () => (
        <FormEntryRow
          field="leaderIndex"
          value={followerIndex.leaderIndex}
          error={fieldsErrors.leaderIndex}
          label={i18n.translate('xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexTitle', {
            defaultMessage: 'Leader index'
          })}
          description={i18n.translate('xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexDescription', {
            defaultMessage: 'The leader index you want to replicate from the remote cluster.'
          })}
          helpText={(
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexForm.indexNameHelpLabel"
              defaultMessage="Spaces and the characters {characterList} are not allowed."
              values={{ characterList: <strong>{indexNameIllegalCharacters}</strong> }}
            />
          )}
          validator={indexNameValidator}
          disabled={!isNew}
          areErrorsVisible={areErrorsVisible}
          onValueUpdate={this.onFieldsChange}
          onErrorUpdate={this.onFieldsErrorChange}
        />
      );

      /**
       * Advanced settings
       */
      const renderAdvancedSettings = () => (
        <Fragment>
          <EuiButtonEmpty
            iconType={areAdvancedSettingsVisible ? "arrowUp" : "arrowDown"}
            flush="left"
            onClick={this.toggleAdvancedSettings}
          >
            { toggleAdvancedSettingButtonLabel }
          </EuiButtonEmpty>
          <EuiSpacer size="s" />
          {areAdvancedSettingsVisible && (
            advancedSettingsFields.map((advancedSetting) => {
              const { field, label, description, helpText, validator } = advancedSetting;
              return (
                <FormEntryRow
                  key={field}
                  field={field}
                  value={followerIndex[field]}
                  error={fieldsErrors[field]}
                  label={label}
                  description={description}
                  helpText={helpText}
                  validator={validator}
                  areErrorsVisible={areErrorsVisible}
                  onValueUpdate={this.onFieldsChange}
                  onErrorUpdate={this.onFieldsErrorChange}
                />
              );
            })
          )}
        </Fragment>
      );

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
            <EuiSpacer size="s" />
            {renderAdvancedSettings()}
          </EuiForm>
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


