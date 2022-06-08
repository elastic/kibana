/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { QueryClientProvider } from 'react-query';
import { isEmpty, map, pickBy } from 'lodash';
import { EuiAccordionProps, EuiSpacer } from '@elastic/eui';
import { isDeepEqual } from 'react-use/lib/util';
import uuid from 'uuid';
import { ECSMapping } from '../../common/schemas/common';
import { StyledEuiAccordion } from '../components/accordion';
import { ECSMappingEditorField } from '../packs/queries/lazy_ecs_mapping_editor_field';
import { convertECSMappingToObject } from '../../common/schemas/common/utils';
import { Form, UseField, useForm } from '../shared_imports';
import { queryClient } from '../query_client';
import { SavedQueriesDropdown } from '../saved_queries/saved_queries_dropdown';
import { LiveQueryQueryField } from '../live_queries/form/live_query_query_field';
import { useKibana } from '../common/lib/kibana';
import { osqueryConnectorFormSchema } from './schema';

export interface OsqueryActionParams {
  message: {
    alerts: string;
    query: string;
    ecs_mapping: ECSMapping;
  };
}

const OsqueryConnectorForm: React.FunctionComponent<ActionParamsProps<OsqueryActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  actionConnector,
}) => {
  const FORM_ID = useMemo(
    () => `osqueryConnectorForm-${actionConnector?.name}`,
    [actionConnector?.name]
  );

  const permissions = useKibana().services.application.capabilities.osquery;
  const [advancedContentState, setAdvancedContentState] =
    useState<EuiAccordionProps['forceState']>('closed');
  const handleToggle = useCallback((isOpen) => {
    const newState = isOpen ? 'open' : 'closed';
    setAdvancedContentState(newState);
  }, []);

  const isSavedQueryDisabled = useMemo(
    () => !permissions.runSavedQueries || !permissions.readSavedQueries,
    [permissions.readSavedQueries, permissions.runSavedQueries]
  );

  const { form } = useForm({
    id: FORM_ID,
    schema: osqueryConnectorFormSchema,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    serializer: ({ savedQueryId, ecs_mapping, ...formData }) =>
      pickBy(
        {
          ...formData,
          saved_query_id: savedQueryId,
          ecs_mapping: convertECSMappingToObject(ecs_mapping),
        },
        (value) => !isEmpty(value)
      ),
    options: {
      stripEmptyFields: false,
    },
    defaultValue: {
      // @ts-expect-error update types
      query: actionParams.message?.query,
      // @ts-expect-error update types
      savedQueryId: null,
      // @ts-expect-error update types
      ecs_mapping: actionParams.message?.ecs_mapping
        ? map(actionParams.message?.ecs_mapping, (value, key) => ({
            key,
            result: {
              type: Object.keys(value)[0],
              value: Object.values(value)[0],
            },
          }))
        : [],
    },
  });
  const { updateFieldValues, setFieldValue, getFormData } = form;
  const ecsFieldProps = useMemo(
    () => ({
      isDisabled: !permissions.writeLiveQueries,
    }),
    [permissions.writeLiveQueries]
  );
  const formData = getFormData();
  const formDataRef = useRef(formData);

  if (!isDeepEqual(formDataRef.current, formData)) {
    formDataRef.current = formData;
  }

  const handleSavedQueryChange = useCallback(
    (savedQuery) => {
      if (savedQuery) {
        updateFieldValues({
          query: savedQuery.query,
          savedQueryId: savedQuery.savedQueryId,
          // @ts-expect-error update types
          ecs_mapping: savedQuery.ecs_mapping
            ? map(savedQuery.ecs_mapping, (value, key) => ({
                key,
                result: {
                  type: Object.keys(value)[0],
                  value: Object.values(value)[0],
                },
              }))
            : [],
        });
        if (!isEmpty(savedQuery.ecs_mapping)) {
          setAdvancedContentState('open');
        }
      } else {
        setFieldValue('savedQueryId', null);
      }
    },
    [setFieldValue, updateFieldValues]
  );

  useEffect(() => {
    editAction(
      'message',
      {
        alerts: `[{{context.alerts}}]`,
        query: formDataRef.current.query,
        ecs_mapping: formDataRef.current.ecs_mapping,
        id: uuid.v4(),
      },
      index
    );
    // Should happen only on after deepEqual check saved to formDataRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formDataRef.current, index, advancedContentState]);

  useEffect(() => {
    if (actionParams.message?.ecs_mapping) {
      setAdvancedContentState('open');
    }
    // Should happen only on the initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Form form={form}>
      {!isSavedQueryDisabled && (
        <>
          <QueryClientProvider client={queryClient}>
            <SavedQueriesDropdown
              disabled={isSavedQueryDisabled}
              onChange={handleSavedQueryChange}
            />
          </QueryClientProvider>
        </>
      )}
      <UseField path="query" component={LiveQueryQueryField} />
      <>
        <EuiSpacer size="m" />
        <StyledEuiAccordion
          id="advanced"
          forceState={advancedContentState}
          onToggle={handleToggle}
          buttonContent="Advanced"
        >
          <EuiSpacer size="xs" />
          <ECSMappingEditorField euiFieldProps={ecsFieldProps} />
        </StyledEuiAccordion>
      </>
    </Form>
  );
};

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryConnectorForm as default };
