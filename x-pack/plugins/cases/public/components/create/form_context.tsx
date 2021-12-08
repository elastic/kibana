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
import { CaseType } from '../../../common/api';
import { UsePostComment, usePostComment } from '../../containers/use_post_comment';
import { useOwnerContext } from '../owner_context/use_owner_context';
import { getConnectorById } from '../utils';

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
  syncAlertsDefaultValue?: boolean;
}

export const FormContext: React.FC<Props> = ({
  afterCaseCreated,
  caseType = CaseType.individual,
  children,
  hideConnectorServiceNowSir,
  onSuccess,
  syncAlertsDefaultValue = true,
}) => {
  const { connectors, loading: isLoadingConnectors } = useConnectors();
  const owner = useOwnerContext();
  const { postCase } = usePostCase();
  const { postComment } = usePostComment();
  const { pushCaseToExternalService } = usePostPushToService();

  const submitCase = useCallback(
    async (
      {
        connectorId: dataConnectorId,
        fields,
        syncAlerts = syncAlertsDefaultValue,
        ...dataWithoutConnectorId
      },
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
      syncAlertsDefaultValue,
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
