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
  EuiAccordion,
  EuiBottomBar,
  EuiHorizontalRule,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
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
import { useCreatePack } from '../../packs/use_create_pack';
import { useUpdatePack } from '../../packs/use_update_pack';

const GhostFormField = () => <></>;

const FORM_ID = 'packForm';

const CommonUseField = getUseField({ component: Field });

interface PackFormProps {
  defaultValue?: OsqueryManagerPackagePolicy;
  packageInfo?: PackagePolicyPackage;
  editMode?: boolean;
}

const PackFormComponent: React.FC<PackFormProps> = ({
  defaultValue,
  packageInfo,
  editMode = false,
}) => {
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const handleHideConfirmationModal = useCallback(() => setShowConfirmationModal(false), []);

  const { data: agentPolicies } = useAgentPolicies();
  const agentPoliciesById = mapKeys(agentPolicies, 'id');
  const agentPolicyOptions = useMemo(
    () =>
      agentPolicies?.map((agentPolicy) => ({
        key: agentPolicy.id,
        label: agentPolicy.name,
        value: agentPolicy.id,
      })) ?? [],
    [agentPolicies]
  );

  const cancelButtonProps = useRouterNavigate(`packs/${editMode ? defaultValue?.id : ''}`);

  const { isLoading: createIsLoading, mutateAsync: createAsync } = useCreatePack({
    withRedirect: true,
  });
  const { isLoading: updateIsLoading, mutateAsync: updateAsync } = useUpdatePack({
    withRedirect: true,
  });

  const { form } = useForm<
    Omit<OsqueryManagerPackagePolicy, 'agent_policy_ids' | 'id'> & {
      agent_policy_ids: string[];
    },
    Omit<OsqueryManagerPackagePolicy, 'agent_policy_ids' | 'id' | 'namespace'> & {
      agent_policy_ids: string[];
      namespace: string[];
    }
  >({
    id: FORM_ID,
    schema: {
      name: {
        type: FIELD_TYPES.TEXT,
        label: i18n.translate('xpack.osquery.pack.form.nameFieldLabel', {
          defaultMessage: 'Name',
        }),
        validations: [
          {
            validator: fieldValidators.emptyField(
              i18n.translate('xpack.osquery.pack.form.nameFieldRequiredErrorMessage', {
                defaultMessage: 'Name is a required field',
              })
            ),
          },
        ],
      },
      description: {
        type: FIELD_TYPES.TEXT,
        label: i18n.translate('xpack.osquery.pack.form.descriptionFieldLabel', {
          defaultMessage: 'Description',
        }),
      },
      namespace: {
        type: FIELD_TYPES.COMBO_BOX,
        label: i18n.translate('xpack.osquery.pack.form.namespaceFieldLabel', {
          defaultMessage: 'Namespace',
        }),
      },
      agent_policy_ids: {
        type: FIELD_TYPES.COMBO_BOX,
        label: i18n.translate('xpack.osquery.pack.form.agentPoliciesFieldLabel', {
          defaultMessage: 'Agent policies',
        }),
      },
    },
    onSubmit: (payload, isValid) => {
      if (!isValid) return Promise.resolve();
      return editMode ? updateAsync({ id: defaultValue.id, ...payload }) : createAsync(payload);
    },
    options: {
      stripEmptyFields: false,
    },
    deserializer: (payload) => ({
      ...payload,
      agent_policy_ids: payload.agent_policy_ids ?? [],
      namespace: [payload.namespace],
    }),
    serializer: (payload) => ({
      ...payload,
      namespace: payload.namespace[0],
    }),
    defaultValue: merge(
      {
        name: '',
        description: '',
        enabled: true,
        agent_policy_ids: [],
        namespace: 'default',
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        package: packageInfo!,
        queries: [],
      },
      defaultValue ?? {}
    ),
  });

  const { submit } = form;

  const policyIdEuiFieldProps = useMemo(() => ({ options: agentPolicyOptions }), [
    agentPolicyOptions,
  ]);

  const [
    {
      package: { version: integrationPackageVersion } = { version: undefined },
      agent_policy_ids: agentPolicyIds,
    },
  ] = useFormData({
    form,
    watch: ['package', 'agent_policy_ids'],
  });

  const currentPolicy = useMemo(() => {
    if (!agentPolicyIds?.length) {
      return {
        agentCount: 0,
        agentPolicy: {} as AgentPolicy,
      };
    }

    const currentAgentPolicy = agentPoliciesById[agentPolicyIds[0]];
    return {
      agentCount: currentAgentPolicy?.agents ?? 0,
      agentPolicy: currentAgentPolicy,
    };
  }, [agentPoliciesById, agentPolicyIds]);

  const handleSaveClick = useCallback(() => {
    if (currentPolicy.agentCount) {
      setShowConfirmationModal(true);
      return;
    }

    submit();
  }, [currentPolicy.agentCount, submit]);

  const handleConfirmConfirmationClick = useCallback(() => {
    submit();
    setShowConfirmationModal(false);
  }, [submit]);

  return (
    <>
      <Form form={form}>
        <EuiDescribedFormGroup
          title={
            <h3>
              <FormattedMessage
                id="xpack.osquery.pack.form.settingsSectionTitleText"
                defaultMessage="Pack settings"
              />
            </h3>
          }
          fullWidth
          description={
            <FormattedMessage
              id="xpack.osquery.pack.form.settingsSectionDescriptionText"
              defaultMessage="Pack include one or more queries that are run
                at a set interval and are associated with an agent policies.
                When you define a pack, it is added as a new Osquery Manager
                policy per Agent policy."
            />
          }
        >
          <CommonUseField path="name" />

          <CommonUseField path="description" />

          <CommonUseField
            path="agent_policy_ids"
            euiFieldProps={policyIdEuiFieldProps}
            component={PolicyIdComboBoxField}
            agentPoliciesById={agentPoliciesById}
          />

          <EuiSpacer />
          <EuiAccordion
            id="accordion1"
            buttonContent={i18n.translate(
              'xpack.osquery.pack.form.advancedSectionToggleButtonLabel',
              { defaultMessage: 'Advanced' }
            )}
          >
            <CommonUseField path="namespace" />
          </EuiAccordion>
        </EuiDescribedFormGroup>

        <EuiHorizontalRule />

        <CommonUseField
          path="queries"
          component={QueriesField}
          integrationPackageVersion={integrationPackageVersion}
        />

        <CommonUseField path="enabled" component={GhostFormField} />
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
                    id="xpack.osquery.pack.form.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  isLoading={createIsLoading || updateIsLoading}
                  color="primary"
                  fill
                  size="m"
                  iconType="save"
                  onClick={handleSaveClick}
                >
                  <FormattedMessage
                    id="xpack.osquery.pack.form.saveQueryButtonLabel"
                    defaultMessage="Save pack"
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

export const PackForm = React.memo(PackFormComponent);
