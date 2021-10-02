/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapKeys, reduce, transform } from 'lodash';
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
import { produce } from 'immer';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { OsqueryManagerPackagePolicy } from '../../../common/types';
import { AgentPolicy, PackagePolicyPackage } from '../../../../fleet/common';
import {
  Form,
  useForm,
  useFormData,
  getUseField,
  Field,
  FIELD_TYPES,
  fieldValidators,
} from '../../shared_imports';
import { useRouterNavigate } from '../../common/lib/kibana';
import { PolicyIdComboBoxField } from './policy_id_combobox_field';
import { QueriesField } from './queries_field';
import { ConfirmDeployAgentPolicyModal } from './confirmation_modal';
import { useAgentPolicies } from '../../agent_policies';
import { useCreatePack } from '../use_create_pack';
import { useUpdatePack } from '../use_update_pack';

const GhostFormField = () => <></>;

const FORM_ID = 'scheduledQueryForm';

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
        // label: agentPolicy.name,
        label: agentPolicy.id,
        value: agentPolicy.id,
      })) ?? [],
    [agentPolicies]
  );

  const cancelButtonProps = useRouterNavigate(`packs/${editMode ? defaultValue?.id : ''}`);

  const { mutateAsync: createAsync } = useCreatePack({
    withRedirect: true,
  });
  const { mutateAsync: updateAsync } = useUpdatePack({
    withRedirect: true,
  });

  const { form } = useForm<
    Omit<OsqueryManagerPackagePolicy, 'policy_id' | 'id'> & {
      policy_ids: string[];
    },
    Omit<OsqueryManagerPackagePolicy, 'policy_id' | 'id'> & {
      policy_ids: string[];
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
      policy_ids: {
        type: FIELD_TYPES.COMBO_BOX,
        label: i18n.translate('xpack.osquery.pack.form.agentPoliciesFieldLabel', {
          defaultMessage: 'Agent policies',
        }),
      },
    },
    onSubmit: (payload, isValid) => {
      if (!isValid) return Promise.resolve();

      return editMode ? updateAsync({ id: defaultValue?.id, ...payload }) : createAsync(payload);
    },
    options: {
      stripEmptyFields: false,
    },
    deserializer: (payload) => ({
      ...payload,
      policy_ids: payload.policy_ids ?? [],

      queries:
        (payload?.queries &&
          Object.entries(payload.queries).map(([id, query]) => ({ ...query, id }))) ??
        [],
    }),
    serializer: (payload) => ({
      ...payload,
      queries: transform(
        payload.queries,
        (result, query) => {
          const { id: queryId, ...rest } = query;
          result[queryId] = rest;
        },
        {}
      ),
    }),
    defaultValue: merge(
      {
        name: '',
        description: '',
        enabled: true,
        queries: [],
        policy_ids: [],
      },
      defaultValue ?? {}
    ),
  });

  const { setFieldValue, submit, isSubmitting } = form;

  const policyIdEuiFieldProps = useMemo(
    () => ({ options: agentPolicyOptions }),
    [agentPolicyOptions]
  );

  const [{ policy_ids: policyIds }] = useFormData({
    form,
    watch: ['policy_ids'],
  });

  const currentPolicy = useMemo(() => {
    if (!policyIds?.length) {
      return {
        agentCount: 0,
        agentPolicy: {} as AgentPolicy,
      };
    }

    const agentCount = reduce(
      policyIds,
      (acc, policyId) => {
        const agentPolicy = agentPoliciesById[policyId];

        return acc + (agentPolicy?.agents ?? 0);
      },
      0
    );

    const currentAgentPolicy = agentPoliciesById[policyIds[0]];
    return {
      agentCount,
      agentPolicy: currentAgentPolicy,
    };
  }, [agentPoliciesById, policyIds]);

  const handleNameChange = useCallback(
    (newName: string) => setFieldValue('name', newName),
    [setFieldValue]
  );

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
              defaultMessage="UPDATE ME!!! Packs include one or more queries that are run
                at a set interval and are associated with an agent policy.
                When you define a pack, it is added as a new
                Osquery Manager policy."
            />
          }
        >
          <CommonUseField path="name" />

          <CommonUseField path="description" />

          <CommonUseField
            path="policy_ids"
            euiFieldProps={policyIdEuiFieldProps}
            component={PolicyIdComboBoxField}
            agentPoliciesById={agentPoliciesById}
          />
        </EuiDescribedFormGroup>

        <EuiHorizontalRule />

        <CommonUseField
          path="queries"
          component={QueriesField}
          packId={defaultValue?.id ?? null}
          integrationPackageVersion={packageInfo?.version}
          handleNameChange={handleNameChange}
        />

        <CommonUseField path="enabled" component={GhostFormField} />
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
                  isLoading={isSubmitting}
                  color="primary"
                  fill
                  size="m"
                  iconType="save"
                  onClick={handleSaveClick}
                >
                  {editMode ? (
                    <FormattedMessage
                      id="xpack.osquery.pack.form.updatePackButtonLabel"
                      defaultMessage="Update pack"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.osquery.pack.form.savePackButtonLabel"
                      defaultMessage="Save pack"
                    />
                  )}
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
