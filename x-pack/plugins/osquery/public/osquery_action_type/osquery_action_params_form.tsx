/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { QueryClientProvider } from 'react-query';
import { isEmpty, pickBy } from 'lodash';
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiCode, EuiEmptyPrompt, EuiLoadingContent, EuiSpacer } from '@elastic/eui';
import { isDeepEqual } from 'react-use/lib/util';
import uuid from 'uuid';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { createGlobalStyle } from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  NOT_AVAILABLE,
  PERMISSION_DENIED,
  SHORT_EMPTY_TITLE,
} from '../shared_components/osquery_action/translations';
import { useFetchStatus } from '../fleet_integration/use_fetch_status';
import { StyledEuiAccordion } from '../components/accordion';
import { ECSMappingEditorField } from '../packs/queries/lazy_ecs_mapping_editor_field';
import type { EcsMappingFormValueArray } from '../../common/schemas/common/utils';
import {
  convertECSMappingToFormValue,
  convertECSMappingToObject,
} from '../../common/schemas/common/utils';
import { Form, UseField, useForm } from '../shared_imports';
import { queryClient } from '../query_client';
import { SavedQueriesDropdown } from '../saved_queries/saved_queries_dropdown';
import { LiveQueryQueryField } from '../live_queries/form/live_query_query_field';
import { useKibana } from '../common/lib/kibana';
import { osqueryActionParamsFormSchema } from './schema';

export interface OsqueryActionParams {
  alerts: string;
  query: string;
  ecs_mapping: Record<string, Record<'field', string>>;
  id?: string;
}

const OverwriteGlobalStyle = createGlobalStyle`
  .euiAccordion {
    label, .euiFormRow {
      display: ${(props: { hidden: boolean }) => (props.hidden ? 'none' : 'inherit')}
    }
  }
`;

const OsqueryActionParamsForm: React.FunctionComponent<ActionParamsProps<OsqueryActionParams>> = ({
  actionParams,
  editAction,
  index,
  actionConnector,
}) => {
  const FORM_ID = useMemo(
    () => `osqueryActionParamsForm-${actionConnector?.name}`,
    [actionConnector?.name]
  );

  const uniqueId = useMemo(() => uuid.v4(), []);
  const { loading, disabled, permissionDenied } = useFetchStatus();

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

  const { form } = useForm<{
    query: string;
    savedQueryId: string | null;
    ecs_mapping: EcsMappingFormValueArray;
  }>({
    id: FORM_ID,
    schema: osqueryActionParamsFormSchema,
    // @ts-expect-error update types
    serializer: (payload) => {
      const { savedQueryId, ecs_mapping: EcsMapping, ...formData } = payload;

      return pickBy(
        {
          ...formData,
          saved_query_id: savedQueryId,
          ecs_mapping: convertECSMappingToObject(EcsMapping),
        },
        (value) => !isEmpty(value)
      );
    },

    options: {
      stripEmptyFields: false,
    },
    defaultValue: {
      query: actionParams?.query,
      savedQueryId: null,
      ecs_mapping: actionParams?.ecs_mapping
        ? convertECSMappingToFormValue(actionParams?.ecs_mapping)
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
  const handleUpdate = useCallback(() => {
    editAction('query', formData.query, index);
    editAction('alerts', `[{{context.alerts}}]`, index);
    editAction('ecs_mapping', formData.ecs_mapping, index);
    editAction('id', uniqueId, index);
  }, [editAction, formData.ecs_mapping, formData.query, index, uniqueId]);

  const handleSavedQueryChange = useCallback(
    (savedQuery) => {
      if (savedQuery) {
        updateFieldValues({
          query: savedQuery.query,
          savedQueryId: savedQuery.savedQueryId,
          ecs_mapping: convertECSMappingToFormValue(savedQuery.ecs_mapping),
        });
        setAdvancedContentState('open');
      } else {
        setFieldValue('savedQueryId', null);
      }

      handleUpdate();
    },
    [handleUpdate, setFieldValue, updateFieldValues]
  );

  useEffect(() => {
    if (!isDeepEqual(formDataRef.current, formData)) {
      formDataRef.current = formData;
      handleUpdate();
    }
  }, [formData, formData.query, handleUpdate]);

  useEffectOnce(() => {
    if (actionParams?.ecs_mapping) {
      setAdvancedContentState('open');
    }
  });

  const componentProps = useMemo(() => ({ onChange: handleUpdate }), [handleUpdate]);

  if (loading) {
    return <EuiLoadingContent lines={5} />;
  }

  if (permissionDenied) {
    return (
      <>
        <OverwriteGlobalStyle hidden={disabled || permissionDenied} />
        <EuiEmptyPrompt
          title={<h2>{PERMISSION_DENIED}</h2>}
          titleSize="xs"
          body={
            <p>
              <FormattedMessage
                id="xpack.osquery.action.missingPrivilleges"
                defaultMessage="To access this page, ask your administrator for {osquery} Kibana privileges."
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                values={{
                  osquery: <EuiCode>osquery</EuiCode>,
                }}
              />
            </p>
          }
        />
      </>
    );
  }

  if (disabled) {
    return (
      <EuiEmptyPrompt
        title={<h2>{SHORT_EMPTY_TITLE}</h2>}
        titleSize="xs"
        body={<p>{NOT_AVAILABLE}</p>}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Form form={form}>
        {!isSavedQueryDisabled && (
          <>
            <SavedQueriesDropdown
              disabled={isSavedQueryDisabled}
              onChange={handleSavedQueryChange}
            />
          </>
        )}
        <UseField path="query" component={LiveQueryQueryField} componentProps={componentProps} />
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
    </QueryClientProvider>
  );
};

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryActionParamsForm as default };
