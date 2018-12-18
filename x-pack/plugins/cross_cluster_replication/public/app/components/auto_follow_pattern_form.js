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
import { SectionError, AutoFollowPatternIndicesPreview } from './';
import { validateAutoFollowPattern, validateLeaderIndexPattern } from '../services/auto_follow_pattern_validators';

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

const getEmptyAutoFollowPattern = (remoteClusters) => ({
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

export class AutoFollowPatternFormUI extends PureComponent {
  static propTypes = {
    saveAutoFollowPattern: PropTypes.func.isRequired,
    autoFollowPattern: PropTypes.object,
    apiError: PropTypes.object,
    apiStatus: PropTypes.string.isRequired,
    remoteClusters: PropTypes.array.isRequired,
  }

  constructor(props) {
    super(props);

    const isNew = this.props.autoFollowPattern === undefined;

    const autoFollowPattern = isNew
      ? getEmptyAutoFollowPattern(this.props.remoteClusters)
      : {
        ...this.props.autoFollowPattern,
      };

    this.state = {
      autoFollowPattern,
      fieldsErrors: validateAutoFollowPattern(autoFollowPattern),
      areErrorsVisible: false,
      isNew,
    };
  }

  onFieldsChange = (fields) => {
    this.setState(({ autoFollowPattern }) => ({
      autoFollowPattern: {
        ...autoFollowPattern,
        ...fields,
      },
    }));

    const errors = validateAutoFollowPattern(fields);
    this.setState(({ fieldsErrors }) => updateFormErrors(errors, fieldsErrors));
  };

  onClusterChange = (remoteCluster) => {
    this.onFieldsChange({ remoteCluster });
  };

  onCreateLeaderIndexPattern = (indexPattern) => {
    const error = validateLeaderIndexPattern(indexPattern);

    if (error) {
      const errors = {
        leaderIndexPatterns:
        {
          ...error,
          alwaysVisible: true,
        },
      };

      this.setState(({ fieldsErrors }) => updateFormErrors(errors, fieldsErrors));

      // Return false to explicitly reject the user's input.
      return false;
    }

    const {
      autoFollowPattern: {
        leaderIndexPatterns,
      },
    } = this.state;

    const newLeaderIndexPatterns = [
      ...leaderIndexPatterns,
      indexPattern,
    ];

    this.onFieldsChange({ leaderIndexPatterns: newLeaderIndexPatterns });
  };

  onLeaderIndexPatternChange = (indexPatterns) => {
    this.onFieldsChange({
      leaderIndexPatterns: indexPatterns.map(({ label }) => label)
    });
  };

  onLeaderIndexPatternInputChange = (leaderIndexPattern) => {
    if (!leaderIndexPattern || !leaderIndexPattern.trim()) {
      return;
    }

    const { autoFollowPattern: { leaderIndexPatterns } } = this.state;

    if (leaderIndexPatterns.includes(leaderIndexPattern)) {
      const { intl } = this.props;
      const errorMsg = intl.formatMessage({
        id: 'xpack.crossClusterReplication.autoFollowPatternForm.leaderIndexPatternError.duplicateMessage',
        defaultMessage: `Duplicate leader index pattern aren't allowed.`,
      });

      const errors = {
        leaderIndexPatterns: {
          message: errorMsg,
          alwaysVisible: true,
        },
      };

      this.setState(({ fieldsErrors }) => updateFormErrors(errors, fieldsErrors));
    } else {
      this.setState(({ fieldsErrors, autoFollowPattern }) => {
        const errors = validateAutoFollowPattern(autoFollowPattern);
        return updateFormErrors(errors, fieldsErrors);
      });
    }
  };

  getFields = () => {
    const { autoFollowPattern: stateFields } = this.state;
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

    const { name, ...autoFollowPattern } = this.getFields();
    this.props.saveAutoFollowPattern(name, autoFollowPattern);
  };

  cancelForm = () => {
    routing.navigate('/auto_follow_patterns');
  };

  /**
   * Secctions Renders
   */
  renderApiErrors() {
    const { apiError, intl } = this.props;

    if (apiError) {
      const title = intl.formatMessage({
        id: 'xpack.crossClusterReplication.autoFollowPatternForm.savingErrorTitle',
        defaultMessage: 'Error creating auto-follow pattern',
      });
      return <SectionError title={title} error={apiError} />;
    }

    return null;
  }

  renderForm = () => {
    const { intl } = this.props;
    const {
      autoFollowPattern: {
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
    const renderAutoFollowPatternName = () => {
      const isInvalid = areErrorsVisible && !!fieldsErrors.name;

      return (
        <EuiDescribedFormGroup
          title={(
            <EuiTitle size="s">
              <h4>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionAutoFollowPatternNameTitle"
                  defaultMessage="Name"
                />
              </h4>
            </EuiTitle>
          )}
          description={(
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.sectionAutoFollowPatternNameDescription"
              defaultMessage="A unique name for the auto-follow pattern."
            />
          )}
          fullWidth
        >
          <EuiFormRow
            label={(
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.autoFollowPatternName.fieldNameLabel"
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
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionRemoteClusterTitle"
                  defaultMessage="Remote cluster"
                />
              </h4>
            </EuiTitle>
          )}
          description={(
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.sectionRemoteClusterDescription"
              defaultMessage="The remote cluster to replicate leader indices from."
            />
          )}
          fullWidth
        >
          <EuiFormRow
            label={(
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.remoteCluster.fieldClusterLabel"
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
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionLeaderIndexPatternsTitle"
                  defaultMessage="Leader indices"
                />
              </h4>
            </EuiTitle>
          )}
          description={(
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionLeaderIndexPatternsDescription1"
                  defaultMessage="One or more index patterns that identify the indices you want to
                    replicate from the remote cluster. As new indices matching these patterns are
                    created, they are replicated to follower indices on the local cluster."
                />
              </p>

              <p>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionLeaderIndexPatternsDescription2"
                  defaultMessage="{note} indices that already exist are not replicated."
                  values={{ note: (
                    <strong>
                      <FormattedMessage
                        id="xpack.crossClusterReplication.autoFollowPatternForm.sectionLeaderIndexPatternsDescription2.noteLabel"
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
                id="xpack.crossClusterReplication.autoFollowPatternForm.fieldLeaderIndexPatternsLabel"
                defaultMessage="Index patterns"
              />
            )}
            helpText={(
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.fieldLeaderIndexPatternsHelpLabel"
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
                id: 'xpack.crossClusterReplication.autoFollowPatternForm.fieldLeaderIndexPatternsPlaceholder',
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
    const renderAutoFollowPattern = () => {
      const isPrefixInvalid = areErrorsVisible && !!fieldsErrors.followIndexPatternPrefix;
      const isSuffixInvalid = areErrorsVisible && !!fieldsErrors.followIndexPatternSuffix;

      return (
        <EuiDescribedFormGroup
          title={(
            <EuiTitle size="s">
              <h4>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionAutoFollowPatternTitle"
                  defaultMessage="Follower indices (optional)"
                />
              </h4>
            </EuiTitle>
          )}
          description={(
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.sectionAutoFollowPatternDescription"
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
                    id="xpack.crossClusterReplication.autoFollowPatternForm.autoFollowPattern.fieldPrefixLabel"
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
                    id="xpack.crossClusterReplication.autoFollowPatternForm.autoFollowPattern.fieldSuffixLabel"
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
              id="xpack.crossClusterReplication.autoFollowPatternForm.fieldFollowerIndicesHelpLabel"
              defaultMessage="Spaces and the characters {characterList} are not allowed."
              values={{ characterList: <strong>{indexNameIllegalCharacters}</strong> }}
            />
          </EuiFormHelpText>

          {!!leaderIndexPatterns.length && (
            <Fragment>
              <EuiSpacer size="m" />
              <AutoFollowPatternIndicesPreview
                prefix={followIndexPatternPrefix}
                suffix={followIndexPatternSuffix}
                leaderIndexPatterns={leaderIndexPatterns}
              />
            </Fragment>
          )}
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
                id="xpack.crossClusterReplication.autoFollowPatternForm.validationErrorTitle"
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
                  id="xpack.crossClusterReplication.autoFollowPatternForm.actions.savingText"
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
                id="xpack.crossClusterReplication.autoFollowPatternForm.saveButtonLabel"
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
                id="xpack.crossClusterReplication.autoFollowPatternForm.cancelButtonLabel"
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
          {renderAutoFollowPatternName()}
          {renderRemoteClusterField()}
          {renderLeaderIndexPatterns()}
          {renderAutoFollowPattern()}
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

export const AutoFollowPatternForm = injectI18n(AutoFollowPatternFormUI);
