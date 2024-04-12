/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { NONE_CONNECTOR_ID } from '../../../common/constants';
import { CaseSeverity } from '../../../common/types/domain';
import type { FormProps } from './schema';
import { schema } from './schema';
import { getNoneConnector, normalizeActionConnector } from '../configure_cases/utils';
import { usePostCase } from '../../containers/use_post_case';
import { usePostPushToService } from '../../containers/use_post_push_to_service';

import type { CasesConfigurationUI, CaseUI, CaseUICustomField } from '../../containers/types';
import type { CasePostRequest } from '../../../common/types/api';
import type { UseCreateAttachments } from '../../containers/use_create_attachments';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesFeatures } from '../../common/use_cases_features';
import {
  getConnectorById,
  getConnectorsFormDeserializer,
  getConnectorsFormSerializer,
  convertCustomFieldValue,
} from '../utils';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import type { CaseAttachmentsWithoutOwner } from '../../types';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useCreateCaseWithAttachmentsTransaction } from '../../common/apm/use_cases_transactions';
import { useGetAllCaseConfigurations } from '../../containers/configure/use_get_all_case_configurations';

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  severity: CaseSeverity.LOW,
  connectorId: NONE_CONNECTOR_ID,
  fields: null,
  syncAlerts: true,
  selectedOwner: null,
  assignees: [],
  customFields: {},
};

interface Props {
  afterCaseCreated?: (
    theCase: CaseUI,
    createAttachments: UseCreateAttachments['mutateAsync']
  ) => Promise<void>;
  children?: JSX.Element | JSX.Element[];
  onSuccess?: (theCase: CaseUI) => void;
  attachments?: CaseAttachmentsWithoutOwner;
  initialValue?: Pick<CasePostRequest, 'title' | 'description'>;
}

export const FormContext: React.FC<Props> = ({
  afterCaseCreated,
  children,
  onSuccess,
  attachments,
  initialValue,
}) => {
  const { data: connectors = [], isLoading: isLoadingConnectors } =
    useGetSupportedActionConnectors();
  const { owner, appId } = useCasesContext();
  const { data: allConfigurations } = useGetAllCaseConfigurations();
  const { isSyncAlertsEnabled } = useCasesFeatures();
  const { mutateAsync: postCase } = usePostCase();
  const { mutateAsync: createAttachments } = useCreateAttachments();
  const { mutateAsync: pushCaseToExternalService } = usePostPushToService();
  const { startTransaction } = useCreateCaseWithAttachmentsTransaction();
  const availableOwners = useAvailableCasesOwners();

  const trimUserFormData = (userFormData: CaseUI) => {
    let formData = {
      ...userFormData,
      title: userFormData.title.trim(),
      description: userFormData.description.trim(),
    };

    if (userFormData.category) {
      formData = { ...formData, category: userFormData.category.trim() };
    }

    if (userFormData.tags) {
      formData = { ...formData, tags: userFormData.tags.map((tag: string) => tag.trim()) };
    }

    return formData;
  };

  const transformCustomFieldsData = useCallback(
    (
      customFields: Record<string, string | boolean>,
      selectedCustomFieldsConfiguration: CasesConfigurationUI['customFields']
    ) => {
      const transformedCustomFields: CaseUI['customFields'] = [];

      if (!customFields || !selectedCustomFieldsConfiguration.length) {
        return [];
      }

      for (const [key, value] of Object.entries(customFields)) {
        const configCustomField = selectedCustomFieldsConfiguration.find(
          (item) => item.key === key
        );
        if (configCustomField) {
          transformedCustomFields.push({
            key: configCustomField.key,
            type: configCustomField.type,
            value: convertCustomFieldValue(value),
          } as CaseUICustomField);
        }
      }

      return transformedCustomFields;
    },
    []
  );

  const submitCase = useCallback(
    async (
      {
        connectorId: dataConnectorId,
        fields,
        syncAlerts = isSyncAlertsEnabled,
        ...dataWithoutConnectorId
      },
      isValid
    ) => {
      if (isValid) {
        const { selectedOwner, customFields, ...userFormData } = dataWithoutConnectorId;
        const caseConnector = getConnectorById(dataConnectorId, connectors);
        const defaultOwner = owner[0] ?? availableOwners[0];

        startTransaction({ appId, attachments });

        const connectorToUpdate = caseConnector
          ? normalizeActionConnector(caseConnector, fields)
          : getNoneConnector();

        const configurationOwner: string | undefined = selectedOwner ? selectedOwner : owner[0];
        const selectedConfiguration = allConfigurations.find(
          (element: CasesConfigurationUI) => element.owner === configurationOwner
        );

        const customFieldsConfiguration = selectedConfiguration
          ? selectedConfiguration.customFields
          : [];

        const transformedCustomFields = transformCustomFieldsData(
          customFields,
          customFieldsConfiguration ?? []
        );

        const trimmedData = trimUserFormData(userFormData);

        const theCase = await postCase({
          request: {
            ...trimmedData,
            connector: connectorToUpdate,
            settings: { syncAlerts },
            owner: selectedOwner ?? defaultOwner,
            customFields: transformedCustomFields,
          },
        });

        // add attachments to the case
        if (theCase && Array.isArray(attachments) && attachments.length > 0) {
          await createAttachments({
            caseId: theCase.id,
            caseOwner: theCase.owner,
            attachments,
          });
        }

        if (afterCaseCreated && theCase) {
          await afterCaseCreated(theCase, createAttachments);
        }

        if (theCase?.id && connectorToUpdate.id !== 'none') {
          await pushCaseToExternalService({
            caseId: theCase.id,
            connector: connectorToUpdate,
          });
        }

        if (onSuccess && theCase) {
          onSuccess(theCase);
        }
      }
    },
    [
      isSyncAlertsEnabled,
      connectors,
      owner,
      availableOwners,
      startTransaction,
      appId,
      attachments,
      transformCustomFieldsData,
      allConfigurations,
      postCase,
      afterCaseCreated,
      onSuccess,
      createAttachments,
      pushCaseToExternalService,
    ]
  );

  const { form } = useForm<FormProps>({
    defaultValue: { ...initialCaseValue, ...initialValue },
    options: { stripEmptyFields: false },
    schema,
    onSubmit: submitCase,
    serializer: getConnectorsFormSerializer,
    deserializer: getConnectorsFormDeserializer,
  });

  const childrenWithExtraProp = useMemo(
    () =>
      children != null
        ? React.Children.map(children, (child: React.ReactElement) =>
            React.cloneElement(child, {
              connectors,
              isLoadingConnectors,
            })
          )
        : null,
    [children, connectors, isLoadingConnectors]
  );
  return (
    <Form
      onKeyDown={(e: KeyboardEvent) => {
        // It avoids the focus scaping from the flyout when enter is pressed.
        // https://github.com/elastic/kibana/issues/111120
        if (e.key === 'Enter') {
          e.stopPropagation();
        }
      }}
      form={form}
    >
      {childrenWithExtraProp}
    </Form>
  );
};

FormContext.displayName = 'FormContext';
