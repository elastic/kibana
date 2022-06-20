/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { QueryClientProvider } from 'react-query';
import { EuiAccordionProps, EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';
import { map } from 'lodash';
import { ECSMapping } from '../../common/schemas/common';
import { StyledEuiAccordion } from '../components/accordion';
import { ECSMappingEditorField } from '../packs/queries/lazy_ecs_mapping_editor_field';
import { UseField, useFormContext } from '../shared_imports';
import { queryClient } from '../query_client';
import { SavedQueriesDropdown } from '../saved_queries/saved_queries_dropdown';
import { LiveQueryQueryField } from '../live_queries/form/live_query_query_field';
import { useKibana } from '../common/lib/kibana';

export interface OsqueryActionParams {
  message: {
    alerts: string;
    query: string;
    ecs_mapping: ECSMapping;
  };
}

const GhostFormField = () => <></>;

const OsqueryConnectorForm: React.FunctionComponent<ActionParamsProps<OsqueryActionParams>> = ({
  actionParams,
  index,
}) => {
  // co
  const uniqueId = useMemo(() => uuid.v4(), []);

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

  const prepareEcsMapping = (mapping: Record<string, Record<string, string>>) =>
    mapping
      ? map(mapping, (value, key) => ({
          key,
          result: {
            type: Object.keys(value)[0],
            value: Object.values(value)[0],
          },
        }))
      : [];

  const ecsFieldProps = useMemo(
    () => ({
      isDisabled: !permissions.writeLiveQueries,
    }),
    [permissions.writeLiveQueries]
  );

  const { updateFieldValues, setFieldValue, getFields } = useFormContext();

  const fields = getFields();

  const handleSavedQueryChange = useCallback(
    (savedQuery) => {
      if (savedQuery) {
        const result = prepareEcsMapping(savedQuery.ecs_mapping);
        updateFieldValues({
          [`actions[${index}].params`]: {
            query: savedQuery.query,
            savedQueryId: savedQuery.savedQueryId,
            ecs_mapping: result,
          },
        });
        setAdvancedContentState('open');
      } else {
        setFieldValue('savedQueryId', null);
      }
    },
    [index, setFieldValue, updateFieldValues]
  );

  useEffect(() => {
    if (actionParams.message?.ecs_mapping) {
      setAdvancedContentState('open');
    }
    // Should happen only on the initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
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
      <UseField
        path={`actions[${index}].params.query`}
        component={LiveQueryQueryField}
        // componentProps={componentProps}
      />
      <UseField
        path={`actions[${index}].params.id`}
        component={GhostFormField}
        defaultValue={uniqueId}
      />
      <UseField path={`actions[${index}].params.savedQueryId`} component={GhostFormField} />
      <UseField
        path={`actions[${index}].params.alerts`}
        component={GhostFormField}
        defaultValue={`[{{context.alerts}}]`}
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

          <ECSMappingEditorField
            euiFieldProps={ecsFieldProps}
            formPath={`actions[${index}].params`}
          />
        </StyledEuiAccordion>
      </>
    </>
  );
};

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryConnectorForm as default };
