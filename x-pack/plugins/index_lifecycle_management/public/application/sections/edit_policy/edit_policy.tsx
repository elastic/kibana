/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { get } from 'lodash';

import './edit_policy.scss';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiPageHeader,
  EuiTimeline,
} from '@elastic/eui';

import {
  TextField,
  useForm,
  useFormData,
  useKibana,
  useFormIsModified,
} from '../../../shared_imports';
import { getPoliciesListPath, getPolicyViewPath } from '../../services/navigation';
import { UseField } from './form';
import { savePolicy } from './save_policy';
import {
  ColdPhase,
  DeletePhase,
  HotPhase,
  FrozenPhase,
  PolicyJsonFlyout,
  WarmPhase,
  Timeline,
  FormErrorsCallout,
  EditWarning,
} from './components';
import {
  createPolicyNameValidations,
  createSerializer,
  createDeserializer,
  Form,
  getSchema,
} from './form';
import { useEditPolicyContext } from './edit_policy_context';
import { FormInternal } from './types';

const policyNamePath = 'name';

export const EditPolicy: React.FunctionComponent = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [isShowingPolicyJsonFlyout, setIsShowingPolicyJsonFlyout] = useState(false);
  const {
    isNewPolicy,
    policy: currentPolicy,
    existingPolicies,
    policyName,
    license,
  } = useEditPolicyContext();

  const {
    services: { cloud, docLinks, history, navigateToUrl, overlays, http },
  } = useKibana();

  const [isClonedPolicy, setIsClonedPolicy] = useState(false);
  const [hasSubmittedForm, setHasSubmittedForm] = useState<boolean>(false);
  const originalPolicyName: string = isNewPolicy ? '' : policyName!;
  const isAllowedByLicense = license.canUseSearchableSnapshot();
  const isCloudEnabled = Boolean(cloud?.isCloudEnabled);

  const serializer = useMemo(() => {
    return createSerializer(isNewPolicy ? undefined : currentPolicy);
  }, [isNewPolicy, currentPolicy]);

  const deserializer = useMemo(() => {
    return createDeserializer(isCloudEnabled);
  }, [isCloudEnabled]);

  const defaultValue = useMemo(
    () => ({
      ...currentPolicy,
      name: originalPolicyName,
    }),
    [currentPolicy, originalPolicyName]
  );

  const schema = useMemo(() => {
    return getSchema(isCloudEnabled);
  }, [isCloudEnabled]);

  const { form } = useForm({
    schema,
    defaultValue,
    deserializer,
    serializer,
  });

  const [formData] = useFormData({ form, watch: policyNamePath });
  const isFormDirty = useFormIsModified({ form });

  const getPolicyName = () => {
    return isNewPolicy || isClonedPolicy ? get(formData, policyNamePath) : originalPolicyName;
  };

  const policyNameValidations = useMemo(
    () =>
      createPolicyNameValidations({
        originalPolicyName,
        policies: existingPolicies,
        isClonedPolicy,
      }),
    [originalPolicyName, existingPolicies, isClonedPolicy]
  );

  const backToPolicyList = (name?: string) => {
    const url = name ? getPolicyViewPath(name) : getPoliciesListPath();
    history.push(url);
  };

  const submit = async () => {
    const { data: policy, isValid } = await form.submit();

    if (!isValid) {
      return;
    }

    const name = getPolicyName();
    setHasSubmittedForm(true);
    const success = await savePolicy(
      {
        ...policy,
        name,
      },
      isNewPolicy || isClonedPolicy
    );

    if (success) {
      backToPolicyList(name);
    }
  };

  const togglePolicyJsonFlyout = () => {
    setIsShowingPolicyJsonFlyout(!isShowingPolicyJsonFlyout);
  };

  useUnsavedChangesPrompt({
    titleText: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.unsavedPrompt.title', {
      defaultMessage: 'Exit without saving changes?',
    }),
    messageText: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.unsavedPrompt.body', {
      defaultMessage:
        'The data will be lost if you leave this page without saving the policy changes.',
    }),
    hasUnsavedChanges: isFormDirty && hasSubmittedForm === false,
    openConfirm: overlays.openConfirm,
    history,
    http,
    navigateToUrl,
  });

  return (
    <>
      <EuiPageHeader
        pageTitle={
          <span data-test-subj="policyTitle">
            {isNewPolicy
              ? i18n.translate('xpack.indexLifecycleMgmt.editPolicy.createPolicyMessage', {
                  defaultMessage: 'Create policy',
                })
              : i18n.translate('xpack.indexLifecycleMgmt.editPolicy.editPolicyMessage', {
                  defaultMessage: 'Edit policy {originalPolicyName}',
                  values: { originalPolicyName },
                })}
          </span>
        }
        bottomBorder
        rightSideItems={[
          <EuiButtonEmpty href={docLinks.links.elasticsearch.ilm} target="_blank" iconType="help">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.documentationLinkText"
              defaultMessage="Documentation"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="l" />

      <Form form={form}>
        {isNewPolicy ? null : (
          <Fragment>
            <EditWarning />
            <EuiSpacer />

            <EuiFormRow>
              <EuiSwitch
                data-test-subj="saveAsNewSwitch"
                style={{ maxWidth: '100%' }}
                checked={isClonedPolicy}
                onChange={(e) => {
                  setIsClonedPolicy(e.target.checked);
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

        {isClonedPolicy || isNewPolicy ? (
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
                    'A policy name cannot start with an underscore and cannot contain a comma or a space.',
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
        ) : null}

        <EuiHorizontalRule />

        <Timeline />

        <EuiSpacer size="l" />

        <EuiTimeline className="ilmPhases">
          <HotPhase />

          <WarmPhase />

          <ColdPhase />

          {isAllowedByLicense && <FrozenPhase />}

          <DeletePhase />
        </EuiTimeline>

        <EuiHorizontalRule />

        <FormErrorsCallout />

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
                >
                  {isClonedPolicy ? (
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
                  onClick={() => backToPolicyList()}
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
            <EuiButtonEmpty onClick={togglePolicyJsonFlyout} data-test-subj="requestButton">
              {isShowingPolicyJsonFlyout ? (
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.hidePolicyJsonButton"
                  defaultMessage="Hide request"
                />
              ) : (
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.showPolicyJsonButton"
                  defaultMessage="Show request"
                />
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        {isShowingPolicyJsonFlyout ? (
          <PolicyJsonFlyout
            policyName={getPolicyName()}
            close={() => setIsShowingPolicyJsonFlyout(false)}
          />
        ) : null}
      </Form>
    </>
  );
};
