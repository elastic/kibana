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
  EuiFormRow,
  EuiLoadingKibana,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiSuperSelect,
} from '@elastic/eui';

import routing from '../services/routing';
import { API_STATUS } from '../constants';
import { SectionError } from './';
import { getPrefixSuffixFromFollowPattern, getPreviewIndicesFromAutoFollowPattern } from '../services/auto_follow_pattern';
import { validateAutoFollowPattern, validateLeaderIndexPattern } from '../services/auto_follow_pattern_validators';

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

export const updateFormValues = (fields) => ({ autoFollowPattern }) => {
  const { leaderIndexPatterns: newLeaderIndexPatterns } = fields;

  let leaderIndexPatterns = autoFollowPattern.leaderIndexPatterns;

  if (newLeaderIndexPatterns) {
    if (Array.isArray(newLeaderIndexPatterns)) {
      // We replace the prop value
      leaderIndexPatterns = newLeaderIndexPatterns;
    } else {
      // We add a value into the Array
      leaderIndexPatterns = [...autoFollowPattern.leaderIndexPatterns, newLeaderIndexPatterns];
    }
  }

  return ({
    autoFollowPattern: {
      ...autoFollowPattern,
      ...fields,
      leaderIndexPatterns
    },
  });
};

export const updateFormErrors = (errors) => ({ fieldsErrors }) => ({
  fieldsErrors: {
    ...fieldsErrors,
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
        ...getPrefixSuffixFromFollowPattern(this.props.autoFollowPattern.followIndexPattern)
      };

    this.state = {
      autoFollowPattern,
      fieldsErrors: validateAutoFollowPattern(autoFollowPattern),
      areErrorsVisible: false,
      isNew,
    };
  }

  onFieldsChange = (fields) => {
    const errors = validateAutoFollowPattern(fields);

    this.setState(updateFormValues(fields));
    this.setState(updateFormErrors(errors));
  }

  onClusterChange = (remoteCluster) => {
    this.onFieldsChange({ remoteCluster });
  };

  onCreateLeaderIndexPattern = (indexPattern) => {
    const error = validateLeaderIndexPattern(indexPattern);

    if (error) {
      this.setState(updateFormErrors({ leaderIndexPatterns: { ...error, alwaysVisible: true } }));

      // Return false to explicitly reject the user's input.
      return false;
    }

    this.onFieldsChange({ leaderIndexPatterns: indexPattern });
  }

  onLeaderIndexPatternChange = (indexPatterns) => {
    this.onFieldsChange({
      leaderIndexPatterns: indexPatterns.map(({ label }) => label)
    });
  }

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
      this.setState(updateFormErrors({ leaderIndexPatterns: { message: errorMsg, alwaysVisible: true } }));
    }
  }

  getFields = () => {
    const { autoFollowPattern: stateFields } = this.state;
    const { followIndexPatternPrefix, followIndexPatternSuffix, ...rest } = stateFields;

    return {
      ...rest,
      followIndexPattern: `${followIndexPatternPrefix}{{leader_index}}${followIndexPatternSuffix}`
    };
  }

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
  }

  cancelForm = () => {
    routing.navigate('/home');
  }

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
      autoFollowPattern: { name, remoteCluster, leaderIndexPatterns, followIndexPatternPrefix, followIndexPatternSuffix },
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
              defaultMessage="Give your auto-follow pattern a unique name."
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
            error={fieldsErrors.name && fieldsErrors.name.message}
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
              defaultMessage="Chose the remote cluster you want to automatically replicate index(ices) from."
            />
          )}
          fullWidth
        >
          <EuiFormRow
            label={(
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.remoteCluster.fieldNameLabel"
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
                  defaultMessage="Leader Index Patterns"
                />
              </h4>
            </EuiTitle>
          )}
          description={(
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.sectionLeaderIndexPatternsDescription"
                defaultMessage="TODO: Copy Text"
              />
            </p>
          )}
          fullWidth
        >
          <EuiFormRow
            label={(
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.fieldLeaderIndexPatternsLabel"
                defaultMessage="Leader Index patterns"
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
              isInvalid={false}
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

      const renderFollowIndicesPreview = () => {
        const { indicesPreview } = getPreviewIndicesFromAutoFollowPattern({
          prefix: followIndexPatternPrefix,
          suffix: followIndexPatternSuffix,
          leaderIndexPatterns
        });

        const title = intl.formatMessage({
          id: 'xpack.crossClusterReplication.autoFollowPatternForm.indicesPreviewTitle',
          defaultMessage: 'Example of indices that will be generated',
        });

        return (
          <EuiCallOut
            title={title}
            iconType="indexMapping"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.indicesPreviewDescription"
              defaultMessage="Here are some examples of the indices that might be generated with the above settings:"
            />
            <ul>
              {indicesPreview.map((followerIndex, i) => <li key={i}>{followerIndex}</li>)}
            </ul>
          </EuiCallOut>
        );
      };

      return (
        <EuiDescribedFormGroup
          title={(
            <EuiTitle size="s">
              <h4>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.sectionAutoFollowPatternTitle"
                  defaultMessage="Follower indices template"
                />
              </h4>
            </EuiTitle>
          )}
          description={(
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.sectionAutoFollowPatternDescription"
              defaultMessage="TODO: Copy text"
            />
          )}
          fullWidth
        >
          <EuiFormRow
            label={(
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.autoFollowPattern.fieldNameLabel"
                defaultMessage="Template prefix"
              />
            )}
            error={fieldsErrors.followIndexPatternPrefix && fieldsErrors.followIndexPatternPrefix.message}
            isInvalid={isPrefixInvalid}
            fullWidth
          >
            <EuiFieldText
              isInvalid={isPrefixInvalid}
              value={followIndexPatternPrefix}
              onChange={e => this.onFieldsChange({ followIndexPatternPrefix: e.target.value })}
              fullWidth
              disabled={false}
            />
          </EuiFormRow>
          <EuiFormRow
            label={(
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.autoFollowPattern.fieldNameLabel"
                defaultMessage="Template suffix"
              />
            )}
            error={fieldsErrors.followIndexPatternSuffix && fieldsErrors.followIndexPatternSuffix.message}
            isInvalid={isSuffixInvalid}
            fullWidth
          >
            <EuiFieldText
              isInvalid={isSuffixInvalid}
              value={followIndexPatternSuffix}
              onChange={e => this.onFieldsChange({ followIndexPatternSuffix: e.target.value })}
              fullWidth
              disabled={false}
            />
          </EuiFormRow>
          {!!leaderIndexPatterns.length && (
            <EuiFormRow>
              {renderFollowIndicesPreview()}
            </EuiFormRow>
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
                id="xpack.remoteClusters.autoFollowPatternForm.validationErrorTitle"
                defaultMessage="Fix errors before saving."
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

      return (
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              color="secondary"
              iconType="check"
              onClick={this.sendForm}
              fill
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
