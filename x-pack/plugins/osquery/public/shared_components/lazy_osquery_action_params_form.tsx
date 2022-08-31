/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { ArrayItem } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

interface LazyOsqueryActionParamsFormProps {
  item: ArrayItem;
}

const GhostFormField = () => <></>;

export const getLazyOsqueryResponseActionTypeForm =
  // eslint-disable-next-line react/display-name
  () => (props: LazyOsqueryActionParamsFormProps) => {
    const { item } = props;
    const OsqueryResponseActionParamsForm = lazy(() => import('./osquery_response_action_type'));

    return (
      <>
        <UseField
          path={`${item.path}.params.query`}
          component={GhostFormField}
          readDefaultValueOnForm={!item.isNew}
        />
        <UseField
          path={`${item.path}.params.savedQueryId`}
          component={GhostFormField}
          readDefaultValueOnForm={!item.isNew}
        />
        <UseField
          path={`${item.path}.params.id`}
          component={GhostFormField}
          readDefaultValueOnForm={!item.isNew}
        />
        <UseField
          path={`${item.path}.params.ecs_mapping`}
          component={GhostFormField}
          readDefaultValueOnForm={!item.isNew}
        />
        <UseField
          path={`${item.path}.params.packId`}
          component={GhostFormField}
          readDefaultValueOnForm={!item.isNew}
        />
        <Suspense fallback={null}>
          <OsqueryResponseActionParamsForm item={item} />
        </Suspense>
      </>
    );
  };
