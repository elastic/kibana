/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';
import type {
  ArrayItem,
  ValidationError,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../query_client';

interface LazyOsqueryActionParamsFormProps {
  item: ArrayItem;
  formRef: React.RefObject<ResponseActionValidatorRef>;
}
interface ResponseActionValidatorRef {
  validation: {
    [key: string]: () => Promise<{ errors: ValidationError<string>; path: string }>;
  };
}

const GhostFormField = () => <></>;
const OsqueryResponseActionParamsForm = lazy(() => import('./osquery_response_action_type'));

export const getLazyOsqueryResponseActionTypeForm =
  // eslint-disable-next-line react/display-name
  () => (props: LazyOsqueryActionParamsFormProps) => {
    const { item, formRef } = props;

    // Wait for mounted is a way to make sure we get form data for this item, otherwise we are missing params
    // Not sure why, but useMountedState or useIsMounted did not work - returning false all the time
    const [isMounted, setMounted] = useState(false);
    useEffect(() => {
      setMounted(true);
    }, []);

    if (isMounted) {
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
    }

    return (
      <UseField
        path={`${item.path}.params`}
        component={GhostFormField}
        readDefaultValueOnForm={!item.isNew}
      />
    );
  };
