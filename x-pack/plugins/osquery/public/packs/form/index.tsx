/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, reduce } from 'lodash';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiBottomBar,
  EuiHorizontalRule,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { OsqueryManagerPackagePolicy } from '../../../common/types';
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
import { convertPackQueriesToSO, convertSOQueriesToPack } from './utils';
import { idSchemaValidation } from '../queries/validations';

const GhostFormField = () => <></>;

const FORM_ID = 'scheduledQueryForm';

const CommonUseField = getUseField({ component: Field });

interface PackFormProps {
  defaultValue?: OsqueryManagerPackagePolicy;
  editMode?: boolean;
}

const PackFormComponent: React.FC<PackFormProps> = ({ defaultValue, editMode = false }) => {
  const isReadOnly = !!defaultValue?.read_only;
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const handleHideConfirmationModal = useCallback(() => setShowConfirmationModal(false), []);

  const { data: { agentPoliciesById } = {} } = useAgentPolicies();

  const cancelButtonProps = useRouterNavigate(`packs/${editMode ? defaultValue?.id : ''}`);

  const { mutateAsync: createAsync } = useCreatePack({
    withRedirect: true,
  });
  const { mutateAsync: updateAsync } = useUpdatePack({
    withRedirect: true,
  });

  const { form } = useForm<
    Omit<OsqueryManagerPackagePolicy, 'policy_id' | 'id'> & {
      queries: {};
      policy_ids: string[];
    },
    Omit<OsqueryManagerPackagePolicy, 'policy_id' | 'id'> & {
      queries: {};
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
            validator: idSchemaValidation,
          },
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
          defaultMessage: 'Description (optional)',
        }),
      },
      policy_ids: {
        defaultValue: [],
        type: FIELD_TYPES.COMBO_BOX,
        label: i18n.translate('xpack.osquery.pack.form.agentPoliciesFieldLabel', {
          defaultMessage: 'Scheduled agent policies (optional)',
        }),
        helpText: i18n.translate('xpack.osquery.pack.form.agentPoliciesFieldHelpText', {
          defaultMessage: 'Queries in this pack are scheduled for agents in the selected policies.',
        }),
      },
      enabled: {
        defaultValue: true,
      },
      queries: {
        defaultValue: [],
      },
    },
    onSubmit: async (formData, isValid) => {
      if (isValid) {
        try {
          if (editMode) {
            // @ts-expect-error update types
            await updateAsync({ id: defaultValue?.id, ...formData });
          } else {
            // @ts-expect-error update types
            await createAsync(formData);
          }
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    },
    deserializer: (payload) => ({
      ...payload,
      policy_ids: payload.policy_ids ?? [],
      queries: convertPackQueriesToSO(payload.queries),
    }),
    serializer: (payload) => ({
      ...payload,
      queries: convertSOQueriesToPack(payload.queries),
    }),
    defaultValue,
  });

  const { setFieldValue, submit, isSubmitting } = form;

  const [{ name: queryName, policy_ids: policyIds }] = useFormData({
    form,
    watch: ['name', 'policy_ids'],
  });

  const agentCount = useMemo(
    () =>
      reduce(
        policyIds,
        (acc, policyId) => {
          const agentPolicy = agentPoliciesById && agentPoliciesById[policyId];
          return acc + (agentPolicy?.agents ?? 0);
        },
        0
      ),
    [policyIds, agentPoliciesById]
  );

  const handleNameChange = useCallback(
    (newName: string) => isEmpty(queryName) && setFieldValue('name', newName),
    [queryName, setFieldValue]
  );

  const handleSaveClick = useCallback(() => {
    if (agentCount) {
      setShowConfirmationModal(true);
      return;
    }

    submit();
  }, [agentCount, submit]);

  const handleConfirmConfirmationClick = useCallback(() => {
    submit();
    setShowConfirmationModal(false);
  }, [submit]);

  const euiFieldProps = useMemo(() => ({ isDisabled: isReadOnly }), [isReadOnly]);

  return (
    <>
      <Form form={form}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <CommonUseField path="name" euiFieldProps={euiFieldProps} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          <EuiFlexItem>
            <CommonUseField path="description" euiFieldProps={euiFieldProps} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          <EuiFlexItem>
            <CommonUseField
              path="policy_ids"
              component={PolicyIdComboBoxField}
              agentPoliciesById={agentPoliciesById}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule />

        <CommonUseField
          path="queries"
          component={QueriesField}
          handleNameChange={handleNameChange}
          euiFieldProps={euiFieldProps}
        />

        <CommonUseField path="enabled" component={GhostFormField} />
      </Form>
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
          agentCount={agentCount}
          agentPolicyCount={policyIds.length}
        />
      )}
    </>
  );
};

export const PackForm = React.memo(PackFormComponent);
