/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { toastNotifications } from 'ui/notify';

import './review.less';

import 'brace/theme/github';
import 'brace/mode/json';
import 'brace/snippets/json';
import 'brace/ext/language_tools';

import {
  EuiTitle,
  EuiCode,
  EuiCallOut,
  EuiSpacer,
  EuiHorizontalRule,
  EuiButton,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiFormRow,
  EuiSwitch,
  EuiFieldText,
  EuiLoadingSpinner,
  EuiFlexGroup,
} from '@elastic/eui';
import { getAffectedIndices } from '../../../../api';
import { DiffView } from './diff_view';
import { ErrableFormRow } from '../../form_errors';
import { STRUCTURE_POLICY_NAME } from '../../../../store/constants';
import { hasErrors } from '../../../../lib/find_errors';

export class Review extends Component {
  static propTypes = {
    setSelectedPolicyName: PropTypes.func.isRequired,
    setSaveAsNewPolicy: PropTypes.func.isRequired,
    done: PropTypes.func.isRequired,
    back: PropTypes.func.isRequired,

    selectedIndexTemplateName: PropTypes.string.isRequired,
    affectedIndexTemplates: PropTypes.array.isRequired,
    templateDiff: PropTypes.object.isRequired,
    lifecycle: PropTypes.object.isRequired,
    selectedPolicyName: PropTypes.string.isRequired,
    saveAsNewPolicy: PropTypes.bool.isRequired,
    originalPolicyName: PropTypes.string,
    bootstrapEnabled: PropTypes.bool.isRequired,
    aliasName: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedTab: 1,
      affectedIndices: [],
      isLoadingAffectedIndices: false,
    };

    this.currentFetchTimeout = null;
  }

  fetchAffectedIndices = () => {
    if (this.currentFetchTimeout) {
      clearTimeout(this.currentFetchTimeout);
    }

    this.setState({ isLoadingAffectedIndices: true });
    this.currentFetchTimeout = setTimeout(async () => {
      const affectedIndices = await getAffectedIndices(
        this.props.selectedIndexTemplateName,
        this.props.selectedPolicyName
      );
      this.setState({ affectedIndices, isLoadingAffectedIndices: false });
    }, 1000);
  }

  async componentWillMount() {
    this.fetchAffectedIndices();
  }

  async componentWillReceiveProps(nextProps) {
    if (nextProps.selectedPolicyName !== this.props.selectedPolicyName) {
      this.fetchAffectedIndices();
    }
  }

  validate = async () => {
    await this.props.validate();
    const noErrors = !hasErrors(this.props.errors);
    return noErrors;
  };

  submit = async () => {
    this.setState({ isShowingErrors: true });
    if (await this.validate()) {
      this.props.done();
    } else {
      toastNotifications.addDanger('Please fix the errors on the page');
    }
  };

  render() {
    const {
      done,
      back,
      setSelectedPolicyName,
      setSaveAsNewPolicy,
      validate,

      errors,
      selectedPolicyName,
      saveAsNewPolicy,
      originalPolicyName,
      selectedIndexTemplateName,
      affectedIndexTemplates,
      templateDiff,
      lifecycle,
      bootstrapEnabled,
      aliasName,
      policies,
    } = this.props;

    const { affectedIndices, isLoadingAffectedIndices, isShowingErrors } = this.state;

    const showSaveChangedMessage = (originalPolicyName && !saveAsNewPolicy)
      || (saveAsNewPolicy && !!policies.find(policy => policy.name === selectedPolicyName));

    return (
      <div className="euiAnimateContentLoad">
        <EuiSpacer />
        <EuiTitle size="s">
          <h3>Review your policy changes</h3>
        </EuiTitle>
        <EuiText>
          <p>When you save a policy, your changes go into effect immediately.</p>
        </EuiText>

        <EuiSpacer />

        <EuiCallOut
          title="Your changes affect these template configurations"
          color="warning"
        >
          <h4>{`${affectedIndexTemplates.length} Index ${affectedIndexTemplates.length === 1 ? 'template' : 'templates'}`}</h4>
          <ul>
            {affectedIndexTemplates.map(template => (
              <li key={template}>{template}</li>
            ))}
          </ul>
          <h4>{`${affectedIndices.length} ${affectedIndices.length === 1 ? 'Index' : 'Indices' }`}</h4>
          { isLoadingAffectedIndices ? (
            <EuiLoadingSpinner size="l"/>
          ) : (
            <ul>
              {affectedIndices.map(index => <li key={index}>{index}</li>)}
            </ul>
          ) }
        </EuiCallOut>

        {bootstrapEnabled ? (
          <Fragment>
            <EuiSpacer />
            <EuiCallOut
              title="This action creates a new index alias"
              color="success"
            >
              <p>You decided to bootstrap a new index. Point to this new alias going forward.</p>
              <h3><span className="ilmAlias">{aliasName}</span> is your new alias</h3>
            </EuiCallOut>
          </Fragment>
        ) : null}

        <EuiHorizontalRule className="ilmHrule" />
        {templateDiff.hasChanged ? (
          <Fragment>
            <EuiTitle>
              <h4>
                <EuiCode>{selectedIndexTemplateName}</EuiCode> template changes
              </h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <DiffView
              templateDiff={templateDiff}
            />
            <EuiHorizontalRule className="ilmHrule" />
          </Fragment>
        ) : null}

        <EuiSpacer />
        <Fragment>
          {originalPolicyName ? (
            <Fragment>
              { showSaveChangedMessage ? (
                <Fragment>
                  <EuiTitle size="s">
                    <h3>Save changes to {selectedPolicyName} policy?</h3>
                  </EuiTitle>
                  <EuiText>
                    <p>
                      <strong>You are editing an existing policy</strong>. Any changes you make
                  will also change index templates that this policy is attached to. Alternately, you can save
                  these changes in a new policy and only change the template you
                  selected.
                    </p>
                  </EuiText>
                  <EuiSpacer />
                </Fragment>
              ) : null }
              <EuiFormRow label="Policy options" style={{ maxWidth: '100%' }}>
                <EuiSwitch
                  style={{ maxWidth: '100%' }}
                  checked={saveAsNewPolicy}
                  onChange={async e => {
                    await setSaveAsNewPolicy(e.target.checked);
                    validate();
                  }}
                  label={
                    <span>
                      Save this <strong>as a new policy</strong>
                    </span>
                  }
                />
              </EuiFormRow>
            </Fragment>
          ) : null}
          {saveAsNewPolicy ? (
            <Fragment>
              <EuiTitle size="s">
                <h3>Save your work</h3>
              </EuiTitle>
              <EuiSpacer />
              <ErrableFormRow
                label="Policy name"
                errorKey={STRUCTURE_POLICY_NAME}
                isShowingErrors={isShowingErrors}
                errors={errors}
              >
                <EuiFieldText
                  value={selectedPolicyName}
                  onChange={async e => {
                    await setSelectedPolicyName(e.target.value);
                    validate();
                  }}
                />
              </ErrableFormRow>
            </Fragment>
          ) : null}
        </Fragment>

        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconSide="left" iconType="sortLeft" onClick={back}>
              Back
            </EuiButtonEmpty>

          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="secondary"
              iconType="check"
              onClick={() => done(lifecycle)}
            >
              Looks good, save changes
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        &nbsp;&nbsp;
      </div>
    );
  }
}
