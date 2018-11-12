/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { toastNotifications } from 'ui/notify';
import { goToPolicyList } from '../../services/navigation';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
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
import { findFirstError } from '../../lib/find_errors';
import { NodeAttrsDetails } from './components/node_attrs_details';
import { PolicyJsonFlyout } from './components/policy_json_flyout';
import { ErrableFormRow } from './form_errors';

class EditPolicyUi extends Component {
  static propTypes = {
    selectedPolicy: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      isShowingErrors: false,
      isShowingNodeDetailsFlyout: false,
      selectedNodeAttrsForDetails: undefined,
      isShowingPolicyJsonFlyout: false
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
    const { intl } = this.props;
    this.setState({ isShowingErrors: true });
    const {
      saveLifecyclePolicy,
      lifecycle,
      saveAsNewPolicy,
      firstError
    } = this.props;
    if (firstError) {
      toastNotifications.addDanger(intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.editPolicy.formErrorsMessage',
        defaultMessage: 'Please the fix errors on the page'
      }));
      const element = document.getElementById(`${firstError}-row`);
      if (element) {
        element.scrollIntoView();
      }
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
  showPolicyJsonFlyout = () => {
    this.setState({ isShowingPolicyJsonFlyout: true });
  };
  render() {
    const {
      intl,
      selectedPolicy,
      errors,
      match: {
        params: { policyName },
      },
      setSaveAsNewPolicy,
      saveAsNewPolicy,
      setSelectedPolicyName,
      isNewPolicy,
      lifecycle
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
                {isNewPolicy
                  ? intl.formatMessage({
                    id: 'xpack.indexLifecycleMgmt.editPolicy.createPolicyMessage',
                    defaultMessage: 'Create an index lifecycle policy'
                  })
                  : intl.formatMessage({
                    id: 'xpack.indexLifecycleMgmt.editPolicy.editPolicyMessage',
                    defaultMessage: 'Edit index lifecycle policy {selectedPolicyName}',
                  }, { selectedPolicyName }) }
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
                          <strong>
                            <FormattedMessage
                              id="xpack.indexLifecycleMgmt.editPolicy.editingExistingPolicyMessage"
                              defaultMessage="You are editing an existing policy"
                            />
                          </strong>.{' '}
                          <FormattedMessage
                            id="xpack.indexLifecycleMgmt.editPolicy.editingExistingPolicyExplanationMessage"
                            defaultMessage={`Any changes you make will affect indices that this policy is attached to.
                              Alternatively, you can save these changes in a new policy.`}
                          />
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
                              <FormattedMessage
                                id="xpack.indexLifecycleMgmt.editPolicy.saveAsNewPolicyMessage"
                                defaultMessage="Save this as a new policy"
                              />
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
                      id={STRUCTURE_POLICY_NAME}
                      label={intl.formatMessage({
                        id: 'xpack.indexLifecycleMgmt.editPolicy.policyNameLabel',
                        defaultMessage: 'Policy name'
                      })}
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
                isShowingErrors={isShowingErrors && findFirstError(errors[PHASE_HOT], false)}
              />
              <EuiHorizontalRule className="ilmHrule" />
              <WarmPhase
                errors={errors[PHASE_WARM]}
                showNodeDetailsFlyout={this.showNodeDetailsFlyout}
                isShowingErrors={isShowingErrors && findFirstError(errors[PHASE_WARM], false)}
              />
              <EuiHorizontalRule className="ilmHrule" />
              <ColdPhase
                errors={errors[PHASE_COLD]}
                showNodeDetailsFlyout={this.showNodeDetailsFlyout}
                isShowingErrors={isShowingErrors && findFirstError(errors[PHASE_COLD], false)}
              />
              <EuiHorizontalRule className="ilmHrule" />
              <DeletePhase
                errors={errors[PHASE_DELETE]}
                isShowingErrors={isShowingErrors && findFirstError(errors[PHASE_DELETE], false)}
              />
              <EuiHorizontalRule className="ilmHrule" />
              <EuiButtonEmpty onClick={this.backToPolicyList}>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.cancelButton"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
              &nbsp;&nbsp;
              <EuiButton fill onClick={this.submit}>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.saveButton"
                  defaultMessage="Save your policy"
                />
              </EuiButton>
              <EuiButtonEmpty onClick={this.showPolicyJsonFlyout}>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.showPolicyJsonButton"
                  defaultMessage="Show JSON"
                />
              </EuiButtonEmpty>
              {this.state.isShowingNodeDetailsFlyout ? (
                <NodeAttrsDetails
                  selectedNodeAttrs={this.state.selectedNodeAttrsForDetails}
                  close={() => this.setState({ isShowingNodeDetailsFlyout: false })}
                />
              ) : null}
              {this.state.isShowingPolicyJsonFlyout ? (
                <PolicyJsonFlyout
                  policyName={policyName || ''}
                  lifecycle={JSON.stringify(lifecycle, null, 4)}
                  close={() => this.setState({ isShowingPolicyJsonFlyout: false })}
                />
              ) : null}
            </div>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
export const EditPolicy = injectI18n(EditPolicyUi);
