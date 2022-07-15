/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { QueryClientProvider } from 'react-query';
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiCode, EuiEmptyPrompt, EuiLoadingContent, EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { createGlobalStyle } from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';

import { UseField, useFormContext } from '../../shared_imports';
import type { ArrayItem } from '../../shared_imports';
import { useKibana } from '../../common/lib/kibana';
import {
  NOT_AVAILABLE,
  PERMISSION_DENIED,
  SHORT_EMPTY_TITLE,
} from '../osquery_action/translations';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';
import { LiveQueryQueryField } from '../../live_queries/form/live_query_query_field';
import { queryClient } from '../../query_client';
import { useFetchStatus } from '../../fleet_integration/use_fetch_status';
import { StyledEuiAccordion } from '../../components/accordion';

// export interface OsqueryActionParams {
//   query: string;
//   ecs_mapping: Record<string, Record<'field', string>>;
//   id?: string;
// }

const GhostFormField = () => <></>;

const OverwriteGlobalStyle = createGlobalStyle`
  .euiAccordion {
    label, .euiFormRow {
      display: ${(props: { hidden: boolean }) => (props.hidden ? 'none' : 'inherit')}
    }
  }
`;

interface IProps {
  item: ArrayItem;
  updateAction: (key: string, value: any, index: number) => void;
}

export const OsqueryResponseActionParamsForm: React.FunctionComponent<IProps> = (props) => {
  const { item } = props;

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

  // const { form } = useForm<{
  //   query: string;
  //   savedQueryId: string | null;
  //   ecs_mapping: EcsMappingFormValueArray;
  // }>({
  //   id: FORM_ID,
  //   schema: osqueryActionParamsFormSchema,
  //   // @ts-expect-error update types
  //   serializer: (payload) => {
  //     const { savedQueryId, ecs_mapping: EcsMapping, ...formData } = payload;
  //
  //     return pickBy(
  //       {
  //         ...formData,
  //         saved_query_id: savedQueryId,
  //         ecs_mapping: convertECSMappingToObject(EcsMapping),
  //       },
  //       (value) => !isEmpty(value)
  //     );
  //   },
  //
  //   options: {
  //     stripEmptyFields: false,
  //   },
  //   defaultValue: {
  //     query: actionParams?.query,
  //     savedQueryId: null,
  //     ecs_mapping: actionParams?.ecs_mapping
  //       ? convertECSMappingToFormValue(actionParams?.ecs_mapping)
  //       : [],
  //   },
  // });

  const context = useFormContext();
  const handleSavedQueryChange = useCallback(
    (savedQuery) => {
      if (savedQuery) {
        context.setFieldValue(`${item.path}.params.savedQueryId`, savedQuery.savedQueryId);
        context.setFieldValue(`${item.path}.params.query`, savedQuery.query);
        // context.setFieldValue(`${item.path}.params.ecs_mapping`, savedQuery.ecs_mapping;
        // context.setFieldValue(`${item.path}.params.ecs_mapping`, convertECSMappingToFormValue(savedQuery.ecs_mapping);
        setAdvancedContentState('open');
      } else {
        context.setFieldValue(`${item.path}.params.savedQueryId`, null);
      }

      // handleUpdate();
    },
    [context, item.path]
  );

  useEffectOnce(() => {
    // if (actionParams?.ecs_mapping) {
    //   setAdvancedContentState('open');
    // }
  });

  const componentProps = useMemo(() => ({ onChange: () => null }), []);
  // const componentProps = useMemo(() => ({ onChange: handleUpdate }), [handleUpdate]);

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
      {!isSavedQueryDisabled && (
        <>
          <SavedQueriesDropdown disabled={isSavedQueryDisabled} onChange={handleSavedQueryChange} />
        </>
      )}
      <UseField
        path={`${item.path}.params.query`}
        component={LiveQueryQueryField}
        componentProps={componentProps}
        readDefaultValueOnForm={!item.isNew}
      />
      <UseField
        path={`${item.path}.id`}
        component={GhostFormField}
        defaultValue={uniqueId}
        readDefaultValueOnForm={!item.isNew}
      />
      <UseField
        path={`${item.path}.actionTypeId`}
        component={GhostFormField}
        defaultValue={'osquery'}
        readDefaultValueOnForm={!item.isNew}
      />
      <UseField
        path={`${item.path}.params.savedQueryId`}
        component={GhostFormField}
        readDefaultValueOnForm={!item.isNew}
      />

      <>
        <EuiSpacer size="m" />
        <StyledEuiAccordion
          id="advanced"
          forceState={advancedContentState}
          onToggle={handleToggle}
          buttonContent="Advanced"
        >
          <EuiSpacer size="xs" />
          {/* <ECSMappingEditorField euiFieldProps={ecsFieldProps} formPath={`${item.path}.params`} />*/}
        </StyledEuiAccordion>
      </>
    </QueryClientProvider>
  );
};

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryResponseActionParamsForm as default };
