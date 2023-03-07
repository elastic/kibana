/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { FormProps } from './schema';
import { schema } from './schema';
import { getNoneConnector, normalizeActionConnector } from '../configure_cases/utils';
import { usePostCase } from '../../containers/use_post_case';
import { usePostPushToService } from '../../containers/use_post_push_to_service';

import type { Case } from '../../containers/types';
import type { CasePostRequest } from '../../../common/api';
import { CaseSeverity, NONE_CONNECTOR_ID } from '../../../common/api';
import type { UseCreateAttachments } from '../../containers/use_create_attachments';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesFeatures } from '../../common/use_cases_features';
import { getConnectorById } from '../utils';
import type { CaseAttachmentsWithoutOwner } from '../../types';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useCreateCaseWithAttachmentsTransaction } from '../../common/apm/use_cases_transactions';

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
};

interface Props {
  afterCaseCreated?: (
    theCase: Case,
    createAttachments: UseCreateAttachments['createAttachments']
  ) => Promise<void>;
  children?: JSX.Element | JSX.Element[];
  onSuccess?: (theCase: Case) => Promise<void>;
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
  const { isSyncAlertsEnabled } = useCasesFeatures();
  const { postCase } = usePostCase();
  const { createAttachments } = useCreateAttachments();
  const { pushCaseToExternalService } = usePostPushToService();
  const { startTransaction } = useCreateCaseWithAttachmentsTransaction();

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
        const { selectedOwner, ...userFormData } = dataWithoutConnectorId;
        const caseConnector = getConnectorById(dataConnectorId, connectors);

        startTransaction({ appId, attachments });

        const connectorToUpdate = caseConnector
          ? normalizeActionConnector(caseConnector, fields)
          : getNoneConnector();

        const updatedCase = await postCase({
          ...userFormData,
          connector: connectorToUpdate,
          settings: { syncAlerts },
          owner: selectedOwner ?? owner[0],
        });

        // add attachments to the case
        if (updatedCase && Array.isArray(attachments) && attachments.length > 0) {
          await createAttachments({
            caseId: updatedCase.id,
            caseOwner: updatedCase.owner,
            data: attachments,
          });
        }

        if (afterCaseCreated && updatedCase) {
          await afterCaseCreated(updatedCase, createAttachments);
        }

        if (updatedCase?.id && connectorToUpdate.id !== 'none') {
          await pushCaseToExternalService({
            caseId: updatedCase.id,
            connector: connectorToUpdate,
          });
        }

        if (onSuccess && updatedCase) {
          await onSuccess(updatedCase);
        }
      }
    },
    [
      appId,
      startTransaction,
      isSyncAlertsEnabled,
      connectors,
      postCase,
      owner,
      afterCaseCreated,
      onSuccess,
      attachments,
      createAttachments,
      pushCaseToExternalService,
    ]
  );

  const { form } = useForm<FormProps>({
    defaultValue: { ...initialCaseValue, ...initialValue },
    options: { stripEmptyFields: false },
    schema,
    onSubmit: submitCase,
  });

  const childrenWithExtraProp = useMemo(
    () =>
      children != null
        ? React.Children.map(children, (child: React.ReactElement) =>
            React.cloneElement(child, { connectors, isLoadingConnectors })
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
