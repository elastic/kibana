/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import routing from '../../../services/routing';
import { API_STATUS } from '../../../constants';
import { SectionError } from '../../../components';

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

const getFirstConnectedCluster = (clusters) => {
  for (let i = 0; i < clusters.length; i++) {
    if (clusters[i].isConnected) {
      return clusters[i];
    }
  }
  return {};
};

class AutoFollowPatternFormUI extends PureComponent {
  static propTypes = {
    createAutoFollowPattern: PropTypes.func.isRequired,
    apiError: PropTypes.object,
    apiStatus: PropTypes.string.isRequired,
    remoteClusters: PropTypes.array.isRequired,
  }

  state = {
    autoFollowPattern: {
      name: '',
      remoteCluster: getFirstConnectedCluster(this.props.remoteClusters).name,
      leaderIndexPatterns: [],
      followIndexPatternPrefix: '',
      followIndexPatternSuffix: '',
    }
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

  /**
   * Work in progress. So far it does not work as we can't control the
   * underline input but I will see this with the EUI team as it would be nice
   * to be able to control the "searchValue" from outside the EuiComboBox.
   * The idea here is to add the leaderIndexPattern when leaving the field without
   * having to press "ENTER"
   */
  onLeaderIndexPatternsBlur = () => {
    // const { value } = e.target;
    // if (typeof value === 'string' && !!value.trim()) {
    //   this.onCreateLeaderIndexPattern(value);
    //   e.target.value = '';
    // }
  }

  onLeaderIndexPatternInputChange = () => {
    // TODO
  }

  /**
   * Return the follow index pattern by concatening the prefix + {{leader_index}} + the sufix
   *
   * @param {boolean} interpretTemplate Whether to replace the {{leader_index}} template by the leader index pattern value
   * @param {number} limit Set the maximum number of result when interpreting the {{leader_index}} template
   * @param {Array<string>} wildcardlaceHolders If interpretTemplate is set to true, those are the value that will replace the "*" from the leader index pattern
   *
   * @example
   * // interpretTemplate === false
   * => "somePrefix_{{leader_index}}_someSuffix"
   *
   * // interpretTemplate === true
   * => ["somePrefix_leader-index-0", "somePrefix_leader-index-1", "somePrefix_leader-index-2"]
   */
  getFollowIndexPattern = (interpretTemplate = false, limit = 3,  wildcardlaceHolders = ['0', '1', '2']) => {
    const { followIndexPatternPrefix, followIndexPatternSuffix, leaderIndexPatterns } = this.state.autoFollowPattern;

    const renderFollowPatternWithTemplateString = (template = '{{leader_index}}') => (
      followIndexPatternPrefix + template + followIndexPatternSuffix
    );

    const renderFollowPatternWithWildcardPlaceholders = () => {
      const indicesPreview = [];
      let indexPreview;
      let leaderIndexTemplate;

      leaderIndexPatterns.forEach((leaderIndexPattern) => {
        wildcardlaceHolders.forEach((placeHolder) => {
          leaderIndexTemplate = leaderIndexPattern.replace(/\*/g, placeHolder);
          indexPreview = renderFollowPatternWithTemplateString(leaderIndexTemplate);

          if (!indicesPreview.includes(indexPreview)) {
            indicesPreview.push(indexPreview);
          }
        });
      });

      return {
        indicesPreview: indicesPreview.slice(0, limit),
        hasMore: indicesPreview.length > limit,
      };
    };

    return interpretTemplate
      ? renderFollowPatternWithWildcardPlaceholders()
      : renderFollowPatternWithTemplateString();
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
    this.props.createAutoFollowPattern(name, autoFollowPattern);
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
      autoFollowPattern: { name, remoteCluster, leaderIndexPatterns, followIndexPatternPrefix, followIndexPatternSuffix }
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
                  defaultMessage="Auto-follow pattern name"
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
              disabled={false}
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
            <EuiSuperSelect
              options={remoteClustersOptions}
              valueOfSelected={remoteCluster}
              onChange={this.onClusterChange}
            />
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
              onBlur={this.onLeaderIndexPatternsBlur}
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
        const { indicesPreview, hasMore } = this.getFollowIndexPattern(true, 5);
        return (
          <EuiCallOut
            title="Example of indices that will be generated"
            iconType="indexMapping"
          >
            <p>Here are some examples of the indices that might be generated with the above settings:</p>
            <ul>
              {indicesPreview.map((followerIndex, i) => <li key={i}>{followerIndex}</li>)}
              {hasMore && <li>...</li>}
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
