/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Assign } from '@kbn/utility-types';
import { omit } from 'lodash';
import { useMemo, useContext } from 'react';
import type { ApmUrlParams } from './types';
import { UrlParamsContext } from './url_params_context';

export function useLegacyUrlParams(): Assign<
  React.ContextType<typeof UrlParamsContext>,
  { urlParams: ApmUrlParams }
> {
  const context = useContext(UrlParamsContext);
  return useMemo(() => {
    return {
      ...context,
      urlParams: omit(context.urlParams, ['environment', 'kuery']),
    };
  }, [context]);
}
