/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapKeys } from 'lodash';
import { merge } from 'lodash/fp';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiDescribedFormGroup,
  EuiSpacer,
  EuiBottomBar,
  EuiHorizontalRule,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { produce } from 'immer';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { PLUGIN_ID } from '../../../common';
import { OsqueryManagerPackagePolicy } from '../../../common/types';
import {
  AgentPolicy,
  PackagePolicyPackage,
  packagePolicyRouteService,
} from '../../../../fleet/common';
import {
  Form,
  useForm,
  useFormData,
  getUseField,
  Field,
  FIELD_TYPES,
  fieldValidators,
} from '../../shared_imports';
import { useKibana, useRouterNavigate } from '../../common/lib/kibana';
import { PolicyIdComboBoxField } from './policy_id_combobox_field';
import { QueriesField } from './queries_field';
import { ConfirmDeployAgentPolicyModal } from './confirmation_modal';
import { useAgentPolicies } from '../../agent_policies';
import { useErrorToast } from '../../common/hooks/use_error_toast';

const GhostFormField = () => <></>;

const FORM_ID = 'scheduledQueryForm';

const CommonUseField = getUseField({ component: Field });

interface ScheduledQueryGroupFormProps {
  defaultValue?: OsqueryManagerPackagePolicy;
  packageInfo?: PackagePolicyPackage;
  editMode?: boolean;
}

const ScheduledQueryGroupFormComponent: React.FC<ScheduledQueryGroupFormProps> = ({
  defaultValue,
  packageInfo,
  editMode = false,
}) => {
  const queryClient = useQueryClient();
  const {
    application: { navigateToApp },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const setErrorToast = useErrorToast();
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const handleHideConfirmationModal = useCallback(() => setShowConfirmationModal(false), []);

  const { data: agentPolicies } = useAgentPolicies();
  const agentPoliciesById = mapKeys(agentPolicies, 'id');
  const agentPolicyOptions = useMemo(
    () =>
      agentPolicies?.map((agentPolicy) => ({
        key: agentPolicy.id,
        label: agentPolicy.id,
      })) ?? [],
    [agentPolicies]
  );

  const cancelButtonProps = useRouterNavigate(
    `scheduled_query_groups/${editMode ? defaultValue?.id : ''}`
  );

  const { mutateAsync } = useMutation(
    (payload: Record<string, unknown>) =>
      editMode && defaultValue?.id
        ? http.put(packagePolicyRouteService.getUpdatePath(defaultValue.id), {
            body: JSON.stringify(payload),
          })
        : http.post(packagePolicyRouteService.getCreatePath(), {
            body: JSON.stringify(payload),
          }),
    {
      onSuccess: (data) => {
        if (!editMode) {
          navigateToApp(PLUGIN_ID, { path: `scheduled_query_groups/${data.item.id}` });
          toasts.addSuccess(
            i18n.translate('xpack.osquery.scheduledQueryGroup.form.createSuccessToastMessageText', {
              defaultMessage: 'Successfully scheduled {scheduledQueryGroupName}',
              values: {
                scheduledQueryGroupName: data.item.name,
              },
            })
          );
          return;
        }

        queryClient.invalidateQueries([
          'scheduledQueryGroup',
          { scheduledQueryGroupId: data.item.id },
        ]);
        setErrorToast();
        navigateToApp(PLUGIN_ID, { path: `scheduled_query_groups/${data.item.id}` });
        toasts.addSuccess(
          i18n.translate('xpack.osquery.scheduledQueryGroup.form.updateSuccessToastMessageText', {
            defaultMessage: 'Successfully updated {scheduledQueryGroupName}',
            values: {
              scheduledQueryGroupName: data.item.name,
            },
          })
        );
      },
      onError: (error) => {
        // @ts-expect-error update types
        setErrorToast(error, { title: error.body.error, toastMessage: error.body.message });
      },
    }
  );

  const { form } = useForm<
    Omit<OsqueryManagerPackagePolicy, 'policy_id' | 'id'> & {
      policy_id: string;
    },
    Omit<OsqueryManagerPackagePolicy, 'policy_id' | 'id' | 'namespace'> & {
      policy_id: string[];
      namespace: string[];
    }
  >({
    id: FORM_ID,
    schema: {
      name: {
        type: FIELD_TYPES.TEXT,
        label: i18n.translate('xpack.osquery.scheduledQueryGroup.form.nameFieldLabel', {
          defaultMessage: 'Name',
        }),
        validations: [
          {
            validator: fieldValidators.emptyField(
              i18n.translate(
                'xpack.osquery.scheduledQueryGroup.form.nameFieldRequiredErrorMessage',
                {
                  defaultMessage: 'Name is a required field',
                }
              )
            ),
          },
        ],
      },
      description: {
        type: FIELD_TYPES.TEXT,
        label: i18n.translate('xpack.osquery.scheduledQueryGroup.form.descriptionFieldLabel', {
          defaultMessage: 'Description',
        }),
      },
      namespace: {
        type: FIELD_TYPES.COMBO_BOX,
        label: i18n.translate('xpack.osquery.scheduledQueryGroup.form.namespaceFieldLabel', {
          defaultMessage: 'Namespace',
        }),
      },
      policy_id: {
        type: FIELD_TYPES.COMBO_BOX,
        label: i18n.translate('xpack.osquery.scheduledQueryGroup.form.agentPolicyFieldLabel', {
          defaultMessage: 'Agent policy',
        }),
        validations: [
          {
            validator: fieldValidators.emptyField(
              i18n.translate(
                'xpack.osquery.scheduledQueryGroup.form.policyIdFieldRequiredErrorMessage',
                {
                  defaultMessage: 'Agent policy is a required field',
                }
              )
            ),
          },
        ],
      },
    },
    onSubmit: (payload, isValid) => {
      if (!isValid) return Promise.resolve();
      const formData = produce(payload, (draft) => {
        if (draft.inputs?.length) {
          draft.inputs[0].streams?.forEach((stream) => {
            delete stream.compiled_stream;

            // we don't want to send id as null when creating the policy
            if (stream.id == null) {
              // @ts-expect-error update types
              delete stream.id;
            }
          });
        }

        return draft;
      });
      return mutateAsync(formData);
    },
    options: {
      stripEmptyFields: false,
    },
    deserializer: (payload) => ({
      ...payload,
      policy_id: payload.policy_id.length ? [payload.policy_id] : [],
      namespace: [payload.namespace],
    }),
    serializer: (payload) => ({
      ...payload,
      policy_id: payload.policy_id[0],
      namespace: payload.namespace[0],
    }),
    defaultValue: merge(
      {
        name: '',
        description: '',
        enabled: true,
        policy_id: '',
        namespace: 'default',
        output_id: '',
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        package: packageInfo!,
        inputs: [
          {
            type: 'osquery',
            enabled: true,
            streams: [],
          },
        ],
      },
      defaultValue ?? {}
    ),
  });

  const { setFieldValue, submit, isSubmitting } = form;

  const policyIdEuiFieldProps = useMemo(
    () => ({ isDisabled: !!defaultValue, options: agentPolicyOptions }),
    [defaultValue, agentPolicyOptions]
  );

  const [
    {
      name: queryName,
      package: { version: integrationPackageVersion } = { version: undefined },
      policy_id: policyId,
    },
  ] = useFormData({
    form,
    watch: ['name', 'package', 'policy_id'],
  });

  const currentPolicy = useMemo(() => {
    if (!policyId) {
      return {
        agentCount: 0,
        agentPolicy: {} as AgentPolicy,
      };
    }

    const currentAgentPolicy = agentPoliciesById[policyId[0]];
    return {
      agentCount: currentAgentPolicy?.agents ?? 0,
      agentPolicy: currentAgentPolicy,
    };
  }, [agentPoliciesById, policyId]);

  const handleNameChange = useCallback(
    (newName: string) => {
      if (queryName === '') {
        setFieldValue('name', newName);
      }
    },
    [setFieldValue, queryName]
  );

  const handleSaveClick = useCallback(() => {
    if (currentPolicy.agentCount) {
      setShowConfirmationModal(true);
      return;
    }

    submit().catch((error) => {
      form.reset({ resetValues: false });
      setErrorToast(error, { title: error.name, toastMessage: error.message });
    });
  }, [currentPolicy.agentCount, submit, form, setErrorToast]);

  const handleConfirmConfirmationClick = useCallback(() => {
    submit().catch((error) => {
      form.reset({ resetValues: false });
      setErrorToast(error, { title: error.name, toastMessage: error.message });
    });
    setShowConfirmationModal(false);
  }, [submit, form, setErrorToast]);

  return (
    <>
      <Form form={form}>
        <EuiDescribedFormGroup
          title={
            <h3>
              <FormattedMessage
                id="xpack.osquery.scheduledQueryGroup.form.settingsSectionTitleText"
                defaultMessage="Scheduled query group settings"
              />
            </h3>
          }
          fullWidth
          description={
            <FormattedMessage
              id="xpack.osquery.scheduledQueryGroup.form.settingsSectionDescriptionText"
              defaultMessage="Scheduled query groups include one or more queries that are run
                at a set interval and are associated with an agent policy.
                When you define a scheduled query group, it is added as a new
                Osquery Manager policy."
            />
          }
        >
          <CommonUseField path="name" />

          <CommonUseField path="description" />

          <CommonUseField
            path="policy_id"
            euiFieldProps={policyIdEuiFieldProps}
            component={PolicyIdComboBoxField}
            agentPoliciesById={agentPoliciesById}
          />

          <CommonUseField path="namespace" component={GhostFormField} />
        </EuiDescribedFormGroup>

        <EuiHorizontalRule />

        <CommonUseField
          path="inputs"
          component={QueriesField}
          scheduledQueryGroupId={defaultValue?.id ?? null}
          integrationPackageVersion={integrationPackageVersion}
          handleNameChange={handleNameChange}
        />

        <CommonUseField path="enabled" component={GhostFormField} />
        <CommonUseField path="output_id" component={GhostFormField} />
        <CommonUseField path="package" component={GhostFormField} />
      </Form>
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiBottomBar>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty color="ghost" {...cancelButtonProps}>
                  <FormattedMessage
                    id="xpack.osquery.scheduledQueryGroup.form.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  isLoading={isSubmitting}
                  color="primary"
                  fill
                  size="m"
                  iconType="save"
                  onClick={handleSaveClick}
                >
                  <FormattedMessage
                    id="xpack.osquery.scheduledQueryGroup.form.saveQueryButtonLabel"
                    defaultMessage="Save query"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
      {showConfirmationModal && (
        <ConfirmDeployAgentPolicyModal
          onCancel={handleHideConfirmationModal}
          onConfirm={handleConfirmConfirmationClick}
          {...currentPolicy}
        />
      )}
    </>
  );
};

export const ScheduledQueryGroupForm = React.memo(ScheduledQueryGroupFormComponent);
