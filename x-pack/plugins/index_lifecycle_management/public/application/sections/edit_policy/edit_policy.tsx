/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { get } from 'lodash';

import { RouteComponentProps } from 'react-router-dom';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiPageHeader,
} from '@elastic/eui';

import { TextField, useForm, useFormData, useKibana } from '../../../shared_imports';
import { toasts } from '../../services/notification';
import { createDocLink } from '../../services/documentation';
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
    license,
  } = useEditPolicyContext();

  const {
    services: { cloud },
  } = useKibana();

  const [saveAsNew, setSaveAsNew] = useState(false);
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
        { ...policy, name: saveAsNew || isNewPolicy ? currentPolicyName : originalPolicyName },
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
          <EuiButtonEmpty
            href={createDocLink('index-lifecycle-management.html')}
            target="_blank"
            iconType="help"
          >
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

        <div>
          <HotPhase />

          <EuiSpacer />
          <WarmPhase />

          <EuiSpacer />
          <ColdPhase />

          {isAllowedByLicense && (
            <>
              <EuiSpacer />
              <FrozenPhase />
            </>
          )}

          {/* We can't add the <EuiSpacer /> here as it breaks the layout
              and makes the connecting line go further that it needs to.
              There is an issue in EUI to fix this (https://github.com/elastic/eui/issues/4492) */}
          <DeletePhase />
        </div>

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
    </>
  );
};
