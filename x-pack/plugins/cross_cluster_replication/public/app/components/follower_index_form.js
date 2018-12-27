/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
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
  EuiFormHelpText,
  EuiFormRow,
  EuiLoadingKibana,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiSuperSelect,
} from '@elastic/eui';

import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/index_patterns';
import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';

import routing from '../services/routing';
import { API_STATUS } from '../constants';
import { SectionError } from './';
import { validateFollowerIndex } from '../services/follower_index_validators';

const indexPatternIllegalCharacters = INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.join(' ');
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
  leaderIndexPatterns: [],
  followIndexPatternPrefix: '',
  followIndexPatternSuffix: '',
});

export const updateFormErrors = (errors, existingErrors) => ({
  fieldsErrors: {
    ...existingErrors,
    ...errors,
  }
});

export const FollowerIndexForm = injectI18n(
  class extends PureComponent {
    static propTypes = {
      saveFollowerIndex: PropTypes.func.isRequired,
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
        areErrorsVisible: false,
        isNew,
      };
    }

    onFieldsChange = (fields) => {
      this.setState(({ followerIndex }) => ({
        followerIndex: {
          ...followerIndex,
          ...fields,
        },
      }));

      const errors = validateFollowerIndex(fields);
      this.setState(({ fieldsErrors }) => updateFormErrors(errors, fieldsErrors));
    };

    onClusterChange = (remoteCluster) => {
      this.onFieldsChange({ remoteCluster });
    };

    getFields = () => {
      const { followerIndex: stateFields } = this.state;
      const { followIndexPatternPrefix, followIndexPatternSuffix, ...rest } = stateFields;

      return {
        ...rest,
        followIndexPattern: `${followIndexPatternPrefix}{{leader_index}}${followIndexPatternSuffix}`
      };
    };

    isFormValid() {
      return Object.values(this.state.fieldsErrors).every(error => error === null);
    }

    sendForm = () => {
      const isFormValid = this.isFormValid();

      if (!isFormValid) {
        this.setState({ areErrorsVisible: true });
        return;
      }

      this.setState({ areErrorsVisible: false });

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
          defaultMessage: 'Error creating auto-follow pattern',
        });
        return <SectionError title={title} error={apiError} />;
      }

      return null;
    }

    renderForm = () => {
      const { intl } = this.props;
      const {
        followerIndex: {
          name,
          remoteCluster,
          leaderIndexPatterns,
          followIndexPatternPrefix,
          followIndexPatternSuffix,
        },
        isNew,
        areErrorsVisible,
        fieldsErrors,
      } = this.state;

      /**
       * Auto-follow pattern Name
       */
      const renderFollowerIndexName = () => {
        const isInvalid = areErrorsVisible && !!fieldsErrors.name;

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
                defaultMessage="A unique name for the auto-follow pattern."
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
              error={fieldsErrors.name}
              isInvalid={isInvalid}
              fullWidth
            >
              <EuiFieldText
                isInvalid={isInvalid}
                value={name}
                onChange={e => this.onFieldsChange({ name: e.target.value })}
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
                defaultMessage="The remote cluster to replicate leader indices from."
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
       * Leader index pattern(s)
       */
      const renderLeaderIndexPatterns = () => {
        const hasError = !!fieldsErrors.leaderIndexPatterns;
        const isInvalid = hasError && (fieldsErrors.leaderIndexPatterns.alwaysVisible || areErrorsVisible);
        const formattedLeaderIndexPatterns = leaderIndexPatterns.map(pattern => ({ label: pattern }));

        return (
          <EuiDescribedFormGroup
            title={(
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexPatternsTitle"
                    defaultMessage="Leader indices"
                  />
                </h4>
              </EuiTitle>
            )}
            description={(
              <Fragment>
                <p>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexPatternsDescription1"
                    defaultMessage="One or more index patterns that identify the indices you want to
                      replicate from the remote cluster. As new indices matching these patterns are
                      created, they are replicated to follower indices on the local cluster."
                  />
                </p>

                <p>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexPatternsDescription2"
                    defaultMessage="{note} indices that already exist are not replicated."
                    values={{ note: (
                      <strong>
                        <FormattedMessage
                          id="xpack.crossClusterReplication.followerIndexForm.sectionLeaderIndexPatternsDescription2.noteLabel"
                          defaultMessage="Note:"
                        />
                      </strong>
                    ) }}
                  />
                </p>
              </Fragment>
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.fieldLeaderIndexPatternsLabel"
                  defaultMessage="Index patterns"
                />
              )}
              helpText={(
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexForm.fieldLeaderIndexPatternsHelpLabel"
                  defaultMessage="Spaces and the characters {characterList} are not allowed."
                  values={{ characterList: <strong>{indexPatternIllegalCharacters}</strong> }}
                />
              )}
              isInvalid={isInvalid}
              error={fieldsErrors.leaderIndexPatterns && fieldsErrors.leaderIndexPatterns.message}
              fullWidth
            >
              <EuiComboBox
                noSuggestions
                placeholder={intl.formatMessage({
                  id: 'xpack.crossClusterReplication.followerIndexForm.fieldLeaderIndexPatternsPlaceholder',
                  defaultMessage: 'Type and then hit ENTER',
                })}
                selectedOptions={formattedLeaderIndexPatterns}
                onCreateOption={this.onCreateLeaderIndexPattern}
                onChange={this.onLeaderIndexPatternChange}
                onSearchChange={this.onLeaderIndexPatternInputChange}
                fullWidth
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        );
      };

      /**
       * Auto-follow pattern
       */
      const renderFollowerIndex = () => {
        const isPrefixInvalid = areErrorsVisible && !!fieldsErrors.followIndexPatternPrefix;
        const isSuffixInvalid = areErrorsVisible && !!fieldsErrors.followIndexPatternSuffix;

        return (
          <EuiDescribedFormGroup
            title={(
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.sectionFollowerIndexTitle"
                    defaultMessage="Follower indices (optional)"
                  />
                </h4>
              </EuiTitle>
            )}
            description={(
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexForm.sectionFollowerIndexDescription"
                defaultMessage="A custom prefix or suffix to apply to the names of the follower
                  indices so you can more easily identify replicated indices. By default, a follower
                  index has the same name as the leader index."
              />
            )}
            fullWidth
          >
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFormRow
                  className="ccrFollowerIndicesFormRow"
                  label={(
                    <FormattedMessage
                      id="xpack.crossClusterReplication.followerIndexForm.followerIndex.fieldPrefixLabel"
                      defaultMessage="Prefix"
                    />
                  )}
                  error={fieldsErrors.followIndexPatternPrefix}
                  isInvalid={isPrefixInvalid}
                  fullWidth
                >
                  <EuiFieldText
                    isInvalid={isPrefixInvalid}
                    value={followIndexPatternPrefix}
                    onChange={e => this.onFieldsChange({ followIndexPatternPrefix: e.target.value })}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiFormRow
                  className="ccrFollowerIndicesFormRow"
                  label={(
                    <FormattedMessage
                      id="xpack.crossClusterReplication.followerIndexForm.followerIndex.fieldSuffixLabel"
                      defaultMessage="Suffix"
                    />
                  )}
                  error={fieldsErrors.followIndexPatternSuffix}
                  isInvalid={isSuffixInvalid}
                  fullWidth
                >
                  <EuiFieldText
                    isInvalid={isSuffixInvalid}
                    value={followIndexPatternSuffix}
                    onChange={e => this.onFieldsChange({ followIndexPatternSuffix: e.target.value })}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiFormHelpText className={isPrefixInvalid || isSuffixInvalid ? null : 'ccrFollowerIndicesHelpText'}>
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexForm.fieldFollowerIndicesHelpLabel"
                defaultMessage="Spaces and the characters {characterList} are not allowed."
                values={{ characterList: <strong>{indexNameIllegalCharacters}</strong> }}
              />
            </EuiFormHelpText>
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
            {renderLeaderIndexPatterns()}
            {renderFollowerIndex()}
          </EuiForm>
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


