/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { Form } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/form';
import { useForm } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form';
import { CaseType } from '../../../common/api/cases/case';
import type { Case } from '../../../common/ui/types';
import { useConnectors } from '../../containers/configure/use_connectors';
import { usePostCase } from '../../containers/use_post_case';
import type { UsePostComment } from '../../containers/use_post_comment';
import { usePostComment } from '../../containers/use_post_comment';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { getNoneConnector, normalizeActionConnector } from '../configure_cases/utils';
import { useOwnerContext } from '../owner_context/use_owner_context';
import { getConnectorById } from '../utils';
import type { FormProps } from './schema';
import { schema } from './schema';

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: 'none',
  fields: null,
  syncAlerts: true,
};

interface Props {
  afterCaseCreated?: (theCase: Case, postComment: UsePostComment['postComment']) => Promise<void>;
  caseType?: CaseType;
  children?: JSX.Element | JSX.Element[];
  hideConnectorServiceNowSir?: boolean;
  onSuccess?: (theCase: Case) => Promise<void>;
}

export const FormContext: React.FC<Props> = ({
  afterCaseCreated,
  caseType = CaseType.individual,
  children,
  hideConnectorServiceNowSir,
  onSuccess,
}) => {
  const { connectors, loading: isLoadingConnectors } = useConnectors();
  const owner = useOwnerContext();
  const { postCase } = usePostCase();
  const { postComment } = usePostComment();
  const { pushCaseToExternalService } = usePostPushToService();

  const submitCase = useCallback(
    async (
      { connectorId: dataConnectorId, fields, syncAlerts = true, ...dataWithoutConnectorId },
      isValid
    ) => {
      if (isValid) {
        const caseConnector = getConnectorById(dataConnectorId, connectors);

        const connectorToUpdate = caseConnector
          ? normalizeActionConnector(caseConnector, fields)
          : getNoneConnector();

        const updatedCase = await postCase({
          ...dataWithoutConnectorId,
          type: caseType,
          connector: connectorToUpdate,
          settings: { syncAlerts },
          owner: owner[0],
        });

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
      connectors,
      postCase,
      caseType,
      owner,
      afterCaseCreated,
      onSuccess,
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
  return <Form form={form}>{childrenWithExtraProp}</Form>;
};

FormContext.displayName = 'FormContext';
