/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { toasts } from '../../services/notification';

import { Phases, Policy, PolicyFromES } from '../../services/policies/types';
import {
  validatePolicy,
  ValidationErrors,
  findFirstError,
} from '../../services/policies/policy_validation';
import { savePolicy } from '../../services/policies/policy_save';
import {
  deserializePolicy,
  getPolicyByName,
  initializeNewPolicy,
} from '../../services/policies/policy_serialization';

import { ErrableFormRow, LearnMoreLink, PolicyJsonFlyout } from './components';
import { ColdPhase, DeletePhase, FrozenPhase, HotPhase, WarmPhase } from './phases';

interface Props {
  policies: PolicyFromES[];
  policyName: string;
  getUrlForApp: (
    appId: string,
    options?: {
      path?: string;
      absolute?: boolean;
    }
  ) => string;
  history: any;
}
export const EditPolicy: React.FunctionComponent<Props> = ({
  policies,
  policyName,
  history,
  getUrlForApp,
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [isShowingErrors, setIsShowingErrors] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>();
  const [isShowingPolicyJsonFlyout, setIsShowingPolicyJsonFlyout] = useState(false);

  const existingPolicy = getPolicyByName(policies, policyName);

  const [policy, setPolicy] = useState<Policy>(
    existingPolicy ? deserializePolicy(existingPolicy) : initializeNewPolicy(policyName)
  );

  const isNewPolicy: boolean = !Boolean(existingPolicy);
  const [saveAsNew, setSaveAsNew] = useState(isNewPolicy);
  const originalPolicyName: string = existingPolicy ? existingPolicy.name : '';

  const backToPolicyList = () => {
    history.push('/policies');
  };

  const submit = async () => {
    setIsShowingErrors(true);
    const [isValid, validationErrors] = validatePolicy(
      saveAsNew,
      policy,
      policies,
      originalPolicyName
    );
    setErrors(validationErrors);

    if (!isValid) {
      toasts.addDanger(
        i18n.translate('xpack.indexLifecycleMgmt.editPolicy.formErrorsMessage', {
          defaultMessage: 'Please fix the errors on this page.',
        })
      );
      const firstError = findFirstError(validationErrors);
      const errorRowId = `${firstError ? firstError.replace('.', '-') : ''}-row`;
      const element = document.getElementById(errorRowId);
      if (element) {
        element.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
    } else {
      const success = await savePolicy(policy, isNewPolicy || saveAsNew, existingPolicy);
      if (success) {
        backToPolicyList();
      }
    }
  };

  const togglePolicyJsonFlyout = () => {
    setIsShowingPolicyJsonFlyout(!isShowingPolicyJsonFlyout);
  };

  const setPhaseData = (phase: keyof Phases, key: string, value: any) => {
    setPolicy({
      ...policy,
      phases: {
        ...policy.phases,
        [phase]: { ...policy.phases[phase], [key]: value },
      },
    });
  };

  const setWarmPhaseOnRollover = (value: boolean) => {
    setPolicy({
      ...policy,
      phases: {
        ...policy.phases,
        hot: {
          ...policy.phases.hot,
          rolloverEnabled: value,
        },
        warm: {
          ...policy.phases.warm,
          warmPhaseOnRollover: value,
        },
      },
    });
  };

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

            {isNewPolicy ? null : (
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

                <EuiFormRow>
                  <EuiSwitch
                    data-test-subj="saveAsNewSwitch"
                    style={{ maxWidth: '100%' }}
                    checked={saveAsNew}
                    onChange={(e) => {
                      setSaveAsNew(e.target.checked);
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

            {saveAsNew || isNewPolicy ? (
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
                  id={'policyName'}
                  label={i18n.translate('xpack.indexLifecycleMgmt.editPolicy.policyNameLabel', {
                    defaultMessage: 'Policy name',
                  })}
                  isShowingErrors={isShowingErrors}
                  errors={errors?.policyName}
                  helpText={
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.editPolicy.validPolicyNameMessage"
                      defaultMessage="A policy name cannot start with an underscore and cannot contain a question mark or a space."
                    />
                  }
                >
                  <EuiFieldText
                    data-test-subj="policyNameField"
                    value={policy.name}
                    onChange={(e) => {
                      setPolicy({ ...policy, name: e.target.value });
                    }}
                  />
                </ErrableFormRow>
              </EuiDescribedFormGroup>
            ) : null}

            <EuiSpacer />

            <HotPhase
              errors={errors?.hot}
              isShowingErrors={isShowingErrors && !!errors && Object.keys(errors.hot).length > 0}
              setPhaseData={(key, value) => setPhaseData('hot', key, value)}
              phaseData={policy.phases.hot}
              setWarmPhaseOnRollover={setWarmPhaseOnRollover}
            />

            <EuiHorizontalRule />

            <WarmPhase
              errors={errors?.warm}
              isShowingErrors={isShowingErrors && !!errors && Object.keys(errors.warm).length > 0}
              setPhaseData={(key, value) => setPhaseData('warm', key, value)}
              phaseData={policy.phases.warm}
              hotPhaseRolloverEnabled={policy.phases.hot.rolloverEnabled}
            />

            <EuiHorizontalRule />

            <ColdPhase
              errors={errors?.cold}
              isShowingErrors={isShowingErrors && !!errors && Object.keys(errors.cold).length > 0}
              setPhaseData={(key, value) => setPhaseData('cold', key, value)}
              phaseData={policy.phases.cold}
              hotPhaseRolloverEnabled={policy.phases.hot.rolloverEnabled}
            />

            <EuiHorizontalRule />

            <FrozenPhase
              errors={errors?.frozen}
              isShowingErrors={isShowingErrors && !!errors && Object.keys(errors.frozen).length > 0}
              setPhaseData={(key, value) => setPhaseData('frozen', key, value)}
              phaseData={policy.phases.frozen}
              hotPhaseRolloverEnabled={policy.phases.hot.rolloverEnabled}
            />

            <EuiHorizontalRule />

            <DeletePhase
              errors={errors?.delete}
              isShowingErrors={isShowingErrors && !!errors && Object.keys(errors.delete).length > 0}
              getUrlForApp={getUrlForApp}
              setPhaseData={(key, value) => setPhaseData('delete', key, value)}
              phaseData={policy.phases.delete}
              hotPhaseRolloverEnabled={policy.phases.hot.rolloverEnabled}
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
                      onClick={submit}
                      color="secondary"
                    >
                      {saveAsNew ? (
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
                    <EuiButtonEmpty data-test-subj="cancelTestPolicy" onClick={backToPolicyList}>
                      <FormattedMessage
                        id="xpack.indexLifecycleMgmt.editPolicy.cancelButton"
                        defaultMessage="Cancel"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={togglePolicyJsonFlyout} data-test-subj="requestButton">
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

            {isShowingPolicyJsonFlyout ? (
              <PolicyJsonFlyout
                policyName={policy.name || ''}
                existingPolicy={existingPolicy}
                policy={policy}
                close={() => setIsShowingPolicyJsonFlyout(false)}
              />
            ) : null}
          </div>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
