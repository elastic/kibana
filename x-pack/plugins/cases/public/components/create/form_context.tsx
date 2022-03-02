/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { schema, FormProps } from './schema';
import { Form, useForm } from '../../common/shared_imports';
import { getNoneConnector, normalizeActionConnector } from '../configure_cases/utils';
import { usePostCase } from '../../containers/use_post_case';
import { usePostPushToService } from '../../containers/use_post_push_to_service';

import { useConnectors } from '../../containers/configure/use_connectors';
import { Case } from '../../containers/types';
import { NONE_CONNECTOR_ID } from '../../../common/api';
import { UsePostComment, usePostComment } from '../../containers/use_post_comment';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesFeatures } from '../cases_context/use_cases_features';
import { getConnectorById } from '../utils';
import { CaseAttachments } from '../../types';

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: NONE_CONNECTOR_ID,
  fields: null,
  syncAlerts: true,
  selectedOwner: null,
};

interface Props {
  afterCaseCreated?: (theCase: Case, postComment: UsePostComment['postComment']) => Promise<void>;
  children?: JSX.Element | JSX.Element[];
  onSuccess?: (theCase: Case) => Promise<void>;
  attachments?: CaseAttachments;
}

export const FormContext: React.FC<Props> = ({
  afterCaseCreated,
  children,
  onSuccess,
  attachments,
}) => {
  const { connectors, loading: isLoadingConnectors } = useConnectors();
  const { owner } = useCasesContext();
  const { isSyncAlertsEnabled } = useCasesFeatures();
  const { postCase } = usePostCase();
  const { postComment } = usePostComment();
  const { pushCaseToExternalService } = usePostPushToService();

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
        if (updatedCase && Array.isArray(attachments)) {
          // TODO currently the API only supports to add a comment at the time
          // once the API is updated we should use bulk post comment #124814
          // this operation is intentionally made in sequence
          for (const attachment of attachments) {
            await postComment({
              caseId: updatedCase.id,
              data: attachment,
            });
          }
        }

        if (afterCaseCreated && updatedCase) {
          await afterCaseCreated(updatedCase, postComment);
        }

        if (updatedCase?.id && dataConnectorId !== 'none') {
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
      isSyncAlertsEnabled,
      connectors,
      postCase,
      owner,
      afterCaseCreated,
      onSuccess,
      attachments,
      postComment,
      pushCaseToExternalService,
    ]
  );

  const { form } = useForm<FormProps>({
    defaultValue: initialCaseValue,
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
