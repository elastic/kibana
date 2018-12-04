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

export class AutoFollowPatternFormUI extends PureComponent {
  static propTypes = {
    saveAutoFollowPattern: PropTypes.func.isRequired,
    autoFollowPattern: PropTypes.object,
    apiError: PropTypes.object,
    apiStatus: PropTypes.string.isRequired,
    remoteClusters: PropTypes.array.isRequired,
  }

  state = {
    autoFollowPattern: this.props.autoFollowPattern
      ? {
        ...this.props.autoFollowPattern,
        ...getPrefixSuffixFromFollowPattern(this.props.autoFollowPattern.followIndexPattern)
      }
      : getEmptyAutoFollowPattern(this.props.remoteClusters),
    isNew: typeof this.props.autoFollowPattern === 'undefined'
  }

  onFieldsChange = (fields) => {
    this.setState(({ autoFollowPattern }) => ({
      autoFollowPattern: {
        ...autoFollowPattern,
        ...fields
      }
    }));
  }

  onClusterChange = (remoteCluster) => {
    this.onFieldsChange({ remoteCluster });
  };

  onCreateLeaderIndexPattern = (indexPattern) => {
    this.setState(({ autoFollowPattern }) => ({
      autoFollowPattern: {
        ...autoFollowPattern,
        leaderIndexPatterns: [...autoFollowPattern.leaderIndexPatterns, indexPattern]
      }
    }));
  }

  onLeaderIndexPatternChange = (indexPatterns) => {
    this.onFieldsChange({
      leaderIndexPatterns: indexPatterns.map(({ label }) => label)
    });
  }

  onLeaderIndexPatternInputChange = () => {
    // TODO
  }

  getFields = () => {
    const { autoFollowPattern: stateFields } = this.state;
    const { followIndexPatternPrefix, followIndexPatternSuffix, ...rest } = stateFields;

    return {
      ...rest,
      followIndexPattern: `${followIndexPatternPrefix}{{leader_index}}${followIndexPatternSuffix}`
    };
  }

  sendForm = () => {
    const { name, ...autoFollowPattern } = this.getFields();
    this.props.saveAutoFollowPattern(name, autoFollowPattern);
  }

  cancelForm = () => {
    routing.navigate('/home');
  }

  /**
   * Secctions Renders
   */
  renderErrors() {
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
    } = this.state;

    /**
     * Auto-follow pattern Name
     */
    const renderAutoFollowPatternName = () => {
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
            error={null}
            isInvalid={false}
            fullWidth
          >
            <EuiFieldText
              isInvalid={false}
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
            error={null}
            isInvalid={false}
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
            isInvalid={false}
            error={null}
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
            error={null}
            isInvalid={false}
            fullWidth
          >
            <EuiFieldText
              isInvalid={false}
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
            error={null}
            isInvalid={false}
            fullWidth
          >
            <EuiFieldText
              isInvalid={false}
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
        {this.renderErrors()}
        {this.renderForm()}
        {this.renderLoading()}
      </Fragment>
    );
  }
}

export const AutoFollowPatternForm = injectI18n(AutoFollowPatternFormUI);
