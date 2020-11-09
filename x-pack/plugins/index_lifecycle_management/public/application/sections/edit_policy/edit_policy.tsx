/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState, useMemo } from 'react';
import { get } from 'lodash';

import { RouteComponentProps } from 'react-router-dom';

import { FormattedMessage } from '@kbn/i18n/react';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
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

import { useForm, Form, UseField, TextField, useFormData } from '../../../shared_imports';

import { toasts } from '../../services/notification';

import { savePolicy } from './save_policy';

import {
  LearnMoreLink,
  PolicyJsonFlyout,
  ColdPhase,
  DeletePhase,
  HotPhase,
  WarmPhase,
} from './components';

import { schema, deserializer, createSerializer, createPolicyNameValidations } from './form';

import { useEditPolicyContext } from './edit_policy_context';
import { FormInternal } from './types';

export interface Props {
  history: RouteComponentProps['history'];
}

const policyNamePath = 'name';

export const EditPolicy: React.FunctionComponent<Props> = ({ history }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [isShowingPolicyJsonFlyout, setIsShowingPolicyJsonFlyout] = useState(false);
  const {
    isNewPolicy,
    policy: currentPolicy,
    existingPolicies,
    policyName,
  } = useEditPolicyContext();

  const serializer = useMemo(() => {
    return createSerializer(isNewPolicy ? undefined : currentPolicy);
  }, [isNewPolicy, currentPolicy]);

  const [saveAsNew, setSaveAsNew] = useState(isNewPolicy);
  const originalPolicyName: string = isNewPolicy ? '' : policyName!;

  const { form } = useForm({
    schema,
    defaultValue: {
      ...currentPolicy,
      name: originalPolicyName,
    },
    deserializer,
    serializer,
  });

  const [formData] = useFormData({ form, watch: policyNamePath });
  const currentPolicyName = get(formData, policyNamePath);

  const policyNameValidations = useMemo(
    () =>
      createPolicyNameValidations({
        originalPolicyName,
        policies: existingPolicies,
        saveAsNewPolicy: saveAsNew,
      }),
    [originalPolicyName, existingPolicies, saveAsNew]
  );

  const backToPolicyList = () => {
    history.push('/policies');
  };

  const submit = async () => {
    const { data: policy, isValid } = await form.submit();

    if (!isValid) {
      toasts.addDanger(
        i18n.translate('xpack.indexLifecycleMgmt.editPolicy.formErrorsMessage', {
          defaultMessage: 'Please fix the errors on this page.',
        })
      );
    } else {
      const success = await savePolicy(
        { ...policy, name: saveAsNew ? currentPolicyName : originalPolicyName },
        isNewPolicy || saveAsNew
      );
      if (success) {
        backToPolicyList();
      }
    }
  };

  const togglePolicyJsonFlyout = () => {
    setIsShowingPolicyJsonFlyout(!isShowingPolicyJsonFlyout);
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
            <Form form={form}>
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
                  <UseField<string, FormInternal>
                    path={policyNamePath}
                    config={{
                      label: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.policyNameLabel', {
                        defaultMessage: 'Policy name',
                      }),
                      helpText: i18n.translate(
                        'xpack.indexLifecycleMgmt.editPolicy.validPolicyNameMessage',
                        {
                          defaultMessage:
                            'A policy name cannot start with an underscore and cannot contain a question mark or a space.',
                        }
                      ),
                      validations: policyNameValidations,
                    }}
                    component={TextField}
                    componentProps={{
                      fullWidth: false,
                      euiFieldProps: {
                        'data-test-subj': 'policyNameField',
                      },
                    }}
                  />
                </EuiDescribedFormGroup>
              ) : null}

              <EuiSpacer />

              <HotPhase />

              <EuiHorizontalRule />

              <WarmPhase />

              <EuiHorizontalRule />

              <ColdPhase />

              <EuiHorizontalRule />

              <DeletePhase />

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
                        disabled={form.isValid === false || form.isSubmitting}
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
                  policyName={saveAsNew ? currentPolicyName : policyName}
                  close={() => setIsShowingPolicyJsonFlyout(false)}
                />
              ) : null}
            </Form>
          </div>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
