/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { QueryClientProvider } from 'react-query';
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';

import { get } from 'lodash';
import { useEffectOnce } from 'react-use';
import { convertECSMappingToFormValue } from '../../../common/schemas/common/utils';
import { ECSMappingEditorField } from '../../packs/queries/lazy_ecs_mapping_editor_field';
import { UseField, useFormContext, useFormData } from '../../shared_imports';
import type { ArrayItem } from '../../shared_imports';
import { useKibana } from '../../common/lib/kibana';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';
import { LiveQueryQueryField } from '../../live_queries/form/live_query_query_field';
import { queryClient } from '../../query_client';
import { StyledEuiAccordion } from '../../components/accordion';

const GhostFormField = () => <></>;

interface IProps {
  item: ArrayItem;
}

export const OsqueryResponseActionParamsForm: React.FunctionComponent<IProps> = React.memo(
  ({ item }) => {
    const [isMounted, setMounted] = useState(false);
    const [data] = useFormData();

    console.log({ data });
    useEffectOnce(() => {
      const actionData = get(data, item.path);

      if (actionData && !isMounted) {
        setMounted(true);
      }
    });
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

    const context = useFormContext();

    const handleSavedQueryChange = useCallback(
      (savedQuery) => {
        if (savedQuery) {
          const params = {
            savedQueryId: savedQuery.savedQueryId,
            query: savedQuery.query,
            ecs_mapping: convertECSMappingToFormValue(savedQuery.ecs_mapping),
          };

          context.updateFieldValues({
            [item.path]: { actionTypeId: '.osquery', params },
          });
          const convertedECS = convertECSMappingToFormValue(savedQuery.ecs_mapping);
          context.setFieldValue(`${item.path}.params.query`, savedQuery.query);
          context.setFieldValue(`${item.path}.params.savedQueryId`, savedQuery.savedQueryId);
          context.setFieldValue(`${item.path}.params.ecs_mapping`, convertedECS);
          setTimeout(
            () =>
              convertedECS.forEach((ecs, index) => {
                context.setFieldValue(`${item.path}.params.ecs_mapping[${index}].key`, ecs.key);
                context.setFieldValue(
                  `${item.path}.params.ecs_mapping[${index}].result.type`,
                  ecs.result.type
                );
                context.setFieldValue(
                  `${item.path}.params.ecs_mapping[${index}].result.value`,
                  ecs.result.value
                );
              }),
            1000
          );
        } else {
          context.setFieldValue(`${item.path}.params.savedQueryId`, null);
        }
      },
      [item.path, context]
    );

    return (
      <QueryClientProvider client={queryClient}>
        {!isSavedQueryDisabled && (
          <>
            <SavedQueriesDropdown
              disabled={isSavedQueryDisabled}
              onChange={handleSavedQueryChange}
            />
          </>
        )}
        <UseField
          path={`${item.path}.params.query`}
          component={LiveQueryQueryField}
          readDefaultValueOnForm={!item.isNew}
        />
        <UseField
          path={`${item.path}.actionTypeId`}
          component={GhostFormField}
          defaultValue={'.osquery'}
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
            {isMounted && <ECSMappingEditorField formPath={`${item.path}.params`} />}
          </StyledEuiAccordion>
        </>
      </QueryClientProvider>
    );
  }
);

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryResponseActionParamsForm as default };
