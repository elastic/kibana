/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { toastNotifications } from 'ui/notify';
import { goToPolicyList } from '../../services/navigation';

import {
  EuiPage,
  EuiPageBody,
  EuiFieldText,
  EuiPageContent,
  EuiFormRow,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiSwitch,
  EuiHorizontalRule,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { HotPhase } from './components/hot_phase';
import { WarmPhase } from './components/warm_phase';
import { DeletePhase } from './components/delete_phase';
import { ColdPhase } from './components/cold_phase';
import {
  PHASE_HOT,
  PHASE_COLD,
  PHASE_DELETE,
  PHASE_WARM,
  STRUCTURE_POLICY_NAME,
} from '../../store/constants';
import { hasErrors } from '../../lib/find_errors';
import { NodeAttrsDetails } from './components/node_attrs_details';
import { ErrableFormRow } from './form_errors';

export class EditPolicy extends Component {
  static propTypes = {
    selectedPolicy: PropTypes.string.isRequired,
    errors: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      isShowingErrors: false,
      isShowingNodeDetailsFlyout: false,
      selectedNodeAttrsForDetails: undefined,
    };
  }
  selectPolicy = policyName => {
    const { setSelectedPolicy, policies } = this.props;
    const selectedPolicy = policies.find(policy => {
      return policy.name === policyName;
    });
    if (selectedPolicy) {
      setSelectedPolicy(selectedPolicy);
    }
  };
  componentDidMount() {
    window.scrollTo(0, 0);
    const {
      match: {
        params: { policyName },
      },
      isPolicyListLoaded,
      fetchPolicies,
    } = this.props;
    if (policyName) {
      if (isPolicyListLoaded) {
        this.selectPolicy(policyName);
      } else {
        fetchPolicies(true, () => {
          this.selectPolicy(policyName);
        });
      }
    }
  }
  backToPolicyList = () => {
    this.props.setSelectedPolicy(null);
    goToPolicyList();
  }
  submit = async () => {
    this.setState({ isShowingErrors: true });
    const {
      errors,
      saveLifecyclePolicy,
      lifecycle,
      saveAsNewPolicy,
    } = this.props;
    if (hasErrors(errors)) {
      toastNotifications.addDanger('Please the fix errors on the page');
    } else {
      const success = await saveLifecyclePolicy(lifecycle, saveAsNewPolicy);
      if (success) {
        this.backToPolicyList();
      }
    }
  };

  showNodeDetailsFlyout = selectedNodeAttrsForDetails => {
    this.setState({ isShowingNodeDetailsFlyout: true, selectedNodeAttrsForDetails });
  };
  render() {
    const {
      selectedPolicy,
      errors,
      match: {
        params: { policyName },
      },
      setSaveAsNewPolicy,
      saveAsNewPolicy,
      setSelectedPolicyName,
    } = this.props;
    const selectedPolicyName = selectedPolicy.name;
    const { isShowingErrors } = this.state;

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent
            verticalPosition="center"
            horizontalPosition="center"
            className="ilmContent"
          >
            <EuiTitle>
              <h4>
                {!selectedPolicyName
                  ? 'Create a lifecycle policy'
                  : `Edit lifecycle policy ${selectedPolicyName}`}
              </h4>
            </EuiTitle>
            <div className="euiAnimateContentLoad">
              <EuiSpacer size="xs" />
              <EuiText color="subdued">
                <p>Configure the phases of your data and when to transition between them.</p>
              </EuiText>
              <EuiSpacer />
              <Fragment>
                {policyName ? (
                  <Fragment>
                    <Fragment>
                      <EuiText>
                        <p>
                          <strong>You are editing an existing policy</strong>. Any changes you make
                          will also change index templates that this policy is attached to.
                          Alternately, you can save these changes in a new policy and only change
                          the index template you selected.
                        </p>
                      </EuiText>
                      <EuiSpacer />
                    </Fragment>
                    {policyName ? (
                      <EuiFormRow>
                        <EuiSwitch
                          style={{ maxWidth: '100%' }}
                          checked={saveAsNewPolicy}
                          onChange={async e => {
                            await setSaveAsNewPolicy(e.target.checked);
                          }}
                          label={
                            <span>
                              Save this <strong>as a new policy</strong>
                            </span>
                          }
                        />
                      </EuiFormRow>
                    ) : null}
                  </Fragment>
                ) : null}
                {saveAsNewPolicy || !policyName ? (
                  <Fragment>
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
                        }}
                      />
                    </ErrableFormRow>
                  </Fragment>
                ) : null}
              </Fragment>
              <EuiSpacer />
              <HotPhase
                selectedPolicy={selectedPolicy}
                errors={errors[PHASE_HOT]}
                isShowingErrors={isShowingErrors && hasErrors(errors[PHASE_HOT])}
              />
              <EuiHorizontalRule className="ilmHrule" />
              <WarmPhase
                errors={errors[PHASE_WARM]}
                showNodeDetailsFlyout={this.showNodeDetailsFlyout}
                isShowingErrors={isShowingErrors && hasErrors(errors[PHASE_WARM])}
              />
              <EuiHorizontalRule className="ilmHrule" />
              <ColdPhase
                errors={errors[PHASE_COLD]}
                showNodeDetailsFlyout={this.showNodeDetailsFlyout}
                isShowingErrors={isShowingErrors && hasErrors(errors[PHASE_COLD])}
              />
              <EuiHorizontalRule className="ilmHrule" />
              <DeletePhase
                errors={errors[PHASE_DELETE]}
                isShowingErrors={isShowingErrors && hasErrors(errors[PHASE_DELETE])}
              />
              <EuiHorizontalRule className="ilmHrule" />
              <EuiButtonEmpty iconSide="left" iconType="sortLeft" onClick={this.backToPolicyList}>
                Back
              </EuiButtonEmpty>
              &nbsp;&nbsp;
              <EuiButton fill iconSide="right" iconType="sortRight" onClick={this.submit}>
                Save your policy
              </EuiButton>
              {this.state.isShowingNodeDetailsFlyout ? (
                <NodeAttrsDetails
                  selectedNodeAttrs={this.state.selectedNodeAttrsForDetails}
                  close={() => this.setState({ isShowingNodeDetailsFlyout: false })}
                />
              ) : null}
            </div>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
