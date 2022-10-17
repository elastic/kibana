/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { ArrayItem } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../query_client';

interface LazyOsqueryActionParamsFormProps {
  item: ArrayItem;
  formRef: React.RefObject<ResponseActionValidatorRef>;
}
interface ResponseActionValidatorRef {
  validation: {
    [key: string]: () => Promise<boolean>;
  };
}

const GhostFormField = () => <></>;

export const getLazyOsqueryResponseActionTypeForm =
  // eslint-disable-next-line react/display-name
  () => (props: LazyOsqueryActionParamsFormProps) => {
    const { item, formRef } = props;
    const OsqueryResponseActionParamsForm = lazy(() => import('./osquery_response_action_type'));

    return (
      <>
        <UseField
          path={`${item.path}.params`}
          component={GhostFormField}
          readDefaultValueOnForm={!item.isNew}
        />
        <Suspense fallback={null}>
          <QueryClientProvider client={queryClient}>
            <OsqueryResponseActionParamsForm item={item} ref={formRef} />
          </QueryClientProvider>
        </Suspense>
      </>
    );
  };
