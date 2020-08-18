/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

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
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescribedFormGroup,
} from '@elastic/eui';

import {
  PHASE_HOT,
  PHASE_COLD,
  PHASE_DELETE,
  PHASE_WARM,
  STRUCTURE_POLICY_NAME,
  WARM_PHASE_ON_ROLLOVER,
  PHASE_ROLLOVER_ENABLED,
} from '../../constants';

import { toasts } from '../../services/notification';
import { findFirstError } from '../../services/find_errors';
import { LearnMoreLink, PolicyJsonFlyout, ErrableFormRow } from './components';

import { HotPhase, WarmPhase, ColdPhase, DeletePhase } from './phases';

export class EditPolicy extends Component {
  static propTypes = {
    selectedPolicy: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      isShowingErrors: false,
      isShowingPolicyJsonFlyout: false,
    };
  }

  selectPolicy = (policyName) => {
    const { setSelectedPolicy, policies } = this.props;

    const selectedPolicy = policies.find((policy) => {
      return policy.name === policyName;
    });

    if (selectedPolicy) {
      setSelectedPolicy(selectedPolicy);
    }
  };

  componentDidMount() {
    window.scrollTo(0, 0);

    const {
      isPolicyListLoaded,
      fetchPolicies,
      match: { params: { policyName } } = { params: {} },
    } = this.props;

    if (policyName) {
      const decodedPolicyName = decodeURIComponent(policyName);
      if (isPolicyListLoaded) {
        this.selectPolicy(decodedPolicyName);
      } else {
        fetchPolicies(true, () => {
          this.selectPolicy(decodedPolicyName);
        });
      }
    } else {
      this.props.setSelectedPolicy(null);
    }
  }

  backToPolicyList = () => {
    this.props.setSelectedPolicy(null);
    this.props.history.push('/policies');
  };

  submit = async () => {
    this.setState({ isShowingErrors: true });
    const { saveLifecyclePolicy, lifecycle, saveAsNewPolicy, firstError } = this.props;
    if (firstError) {
      toasts.addDanger(
        i18n.translate('xpack.indexLifecycleMgmt.editPolicy.formErrorsMessage', {
          defaultMessage: 'Please fix the errors on this page.',
        })
      );
      const errorRowId = `${firstError.replace('.', '-')}-row`;
      const element = document.getElementById(errorRowId);
      if (element) {
        element.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
    } else {
      const success = await saveLifecyclePolicy(lifecycle, saveAsNewPolicy);
      if (success) {
        this.backToPolicyList();
      }
    }
  };

  togglePolicyJsonFlyout = () => {
    this.setState(({ isShowingPolicyJsonFlyout }) => ({
      isShowingPolicyJsonFlyout: !isShowingPolicyJsonFlyout,
    }));
  };

  render() {
    const {
      selectedPolicy,
      errors,
      setSaveAsNewPolicy,
      saveAsNewPolicy,
      setSelectedPolicyName,
      isNewPolicy,
      lifecycle,
      originalPolicyName,
      phases,
      setPhaseData,
    } = this.props;
    const selectedPolicyName = selectedPolicy.name;
    const { isShowingErrors, isShowingPolicyJsonFlyout } = this.state;

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent
            className="ilmEditPolicyPageContent"
            verticalPosition="center"
            horizontalPosition="center"
          >
            <EuiTitle size="l">
              <h1>
                {isNewPolicy
                  ? i18n.translate('xpack.indexLifecycleMgmt.editPolicy.createPolicyMessage', {
                      defaultMessage: 'Create an index lifecycle policy',
                    })
                  : i18n.translate('xpack.indexLifecycleMgmt.editPolicy.editPolicyMessage', {
                      defaultMessage: 'Edit index lifecycle policy {originalPolicyName}',
                      values: { originalPolicyName },
                    })}
              </h1>
            </EuiTitle>

            <div className="euiAnimateContentLoad">
              <EuiSpacer size="xs" />
              <EuiText color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.lifecyclePolicyDescriptionText"
                    defaultMessage="Use an index policy to automate the four phases of the index lifecycle,
                      from actively writing to the index to deleting it."
                  />{' '}
                  <LearnMoreLink
                    docPath="index-lifecycle-management.html"
                    text={
                      <FormattedMessage
                        id="xpack.indexLifecycleMgmt.editPolicy.learnAboutIndexLifecycleManagementLinkText"
                        defaultMessage="Learn about the index lifecycle."
                      />
                    }
                  />
                </p>
              </EuiText>

              <EuiSpacer />

              <Fragment>
                {isNewPolicy ? null : (
                  <Fragment>
                    <Fragment>
                      <EuiText>
                        <p>
                          <strong>
                            <FormattedMessage
                              id="xpack.indexLifecycleMgmt.editPolicy.editingExistingPolicyMessage"
                              defaultMessage="You are editing an existing policy"
                            />
                          </strong>
                          .{' '}
                          <FormattedMessage
                            id="xpack.indexLifecycleMgmt.editPolicy.editingExistingPolicyExplanationMessage"
                            defaultMessage="Any changes you make will affect the indices that are
                              attached to this policy. Alternatively, you can save these changes in
                              a new policy."
                          />
                        </p>
                      </EuiText>
                      <EuiSpacer />
                    </Fragment>

                    <EuiFormRow>
                      <EuiSwitch
                        data-test-subj="saveAsNewSwitch"
                        style={{ maxWidth: '100%' }}
                        checked={saveAsNewPolicy}
                        onChange={async (e) => {
                          await setSaveAsNewPolicy(e.target.checked);
                        }}
                        label={
                          <span>
                            <FormattedMessage
                              id="xpack.indexLifecycleMgmt.editPolicy.saveAsNewPolicyMessage"
                              defaultMessage="Save as new policy"
                            />
                          </span>
                        }
                      />
                    </EuiFormRow>
                  </Fragment>
                )}

                {saveAsNewPolicy || isNewPolicy ? (
                  <EuiDescribedFormGroup
                    title={
                      <div>
                        <span className="eui-displayInlineBlock eui-alignMiddle">
                          <FormattedMessage
                            id="xpack.indexLifecycleMgmt.editPolicy.nameLabel"
                            defaultMessage="Name"
                          />
                        </span>
                      </div>
                    }
                    titleSize="s"
                    fullWidth
                  >
                    <ErrableFormRow
                      id={STRUCTURE_POLICY_NAME}
                      label={i18n.translate('xpack.indexLifecycleMgmt.editPolicy.policyNameLabel', {
                        defaultMessage: 'Policy name',
                      })}
                      errorKey={STRUCTURE_POLICY_NAME}
                      isShowingErrors={isShowingErrors}
                      errors={errors}
                      helpText={
                        <FormattedMessage
                          id="xpack.indexLifecycleMgmt.editPolicy.validPolicyNameMessage"
                          defaultMessage="A policy name cannot start with an underscore and cannot contain a question mark or a space."
                        />
                      }
                    >
                      <EuiFieldText
                        data-test-subj="policyNameField"
                        value={selectedPolicyName}
                        onChange={async (e) => {
                          await setSelectedPolicyName(e.target.value);
                        }}
                      />
                    </ErrableFormRow>
                  </EuiDescribedFormGroup>
                ) : null}
              </Fragment>

              <EuiSpacer />

              <HotPhase
                errors={errors[PHASE_HOT]}
                isShowingErrors={isShowingErrors && !!findFirstError(errors[PHASE_HOT], false)}
                setPhaseData={(key, value) => setPhaseData(PHASE_HOT, key, value)}
                phaseData={phases[PHASE_HOT]}
                setWarmPhaseOnRollover={(value) =>
                  setPhaseData(PHASE_WARM, WARM_PHASE_ON_ROLLOVER, value)
                }
              />

              <EuiHorizontalRule />

              <WarmPhase
                errors={errors[PHASE_WARM]}
                isShowingErrors={isShowingErrors && !!findFirstError(errors[PHASE_WARM], false)}
                setPhaseData={(key, value) => setPhaseData(PHASE_WARM, key, value)}
                phaseData={phases[PHASE_WARM]}
                hotPhaseRolloverEnabled={phases[PHASE_HOT][PHASE_ROLLOVER_ENABLED]}
              />

              <EuiHorizontalRule />

              <ColdPhase
                errors={errors[PHASE_COLD]}
                isShowingErrors={isShowingErrors && !!findFirstError(errors[PHASE_COLD], false)}
                setPhaseData={(key, value) => setPhaseData(PHASE_COLD, key, value)}
                phaseData={phases[PHASE_COLD]}
                hotPhaseRolloverEnabled={phases[PHASE_HOT][PHASE_ROLLOVER_ENABLED]}
              />

              <EuiHorizontalRule />

              <DeletePhase
                errors={errors[PHASE_DELETE]}
                isShowingErrors={isShowingErrors && !!findFirstError(errors[PHASE_DELETE], false)}
                getUrlForApp={this.props.getUrlForApp}
                setPhaseData={(key, value) => setPhaseData(PHASE_DELETE, key, value)}
                phaseData={phases[PHASE_DELETE]}
                hotPhaseRolloverEnabled={phases[PHASE_HOT][PHASE_ROLLOVER_ENABLED]}
              />

              <EuiHorizontalRule />

              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        data-test-subj="savePolicyButton"
                        fill
                        iconType="check"
                        iconSide="left"
                        onClick={this.submit}
                        color="secondary"
                      >
                        {saveAsNewPolicy ? (
                          <FormattedMessage
                            id="xpack.indexLifecycleMgmt.editPolicy.saveAsNewButton"
                            defaultMessage="Save as new policy"
                          />
                        ) : (
                          <FormattedMessage
                            id="xpack.indexLifecycleMgmt.editPolicy.saveButton"
                            defaultMessage="Save policy"
                          />
                        )}
                      </EuiButton>
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        data-test-subj="cancelTestPolicy"
                        onClick={this.backToPolicyList}
                      >
                        <FormattedMessage
                          id="xpack.indexLifecycleMgmt.editPolicy.cancelButton"
                          defaultMessage="Cancel"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={this.togglePolicyJsonFlyout}>
                    {isShowingPolicyJsonFlyout ? (
                      <FormattedMessage
                        id="xpack.indexLifecycleMgmt.editPolicy.hidePolicyJsonButto"
                        defaultMessage="Hide request"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.indexLifecycleMgmt.editPolicy.showPolicyJsonButto"
                        defaultMessage="Show request"
                      />
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>

              {this.state.isShowingPolicyJsonFlyout ? (
                <PolicyJsonFlyout
                  policyName={selectedPolicyName || ''}
                  lifecycle={lifecycle}
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
