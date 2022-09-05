/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  getIndexFieldsRequestParamsRT,
  getIndexFieldsResponsePayloadRT,
  IndexFieldDescriptor,
} from '../../common/http_api/index_fields';
import { decodeOrThrow } from '../../common/runtime_types';
import { useTrackedPromise } from '../utils/use_tracked_promise';
import { useKibanaContextForPlugin } from './use_kibana';

export interface DerivedDataView {
  title: string;
  fields: IndexFieldDescriptor[];
}

export const useDerivedDataView = (indexPattern?: string): DerivedDataView => {
  const fetch = useKibanaFetch();

  const [fields, setFields] = useState<IndexFieldDescriptor[]>([]);
  const [title, setTitle] = useState('unknown');

  const [_, loadIndexFields] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        if (!indexPattern) {
          return { data: [] };
        }

        return await fetch(`/api/infra/index_fields`, {
          method: 'GET',
          query: getIndexFieldsRequestParamsRT.encode({
            indexPattern,
          }),
        });
      },
      onResolve: (result) => {
        if (!indexPattern) {
          return;
        }

        const payload = decodeOrThrow(getIndexFieldsResponsePayloadRT)(result);
        setFields(payload.data);
        setTitle(indexPattern);
      },
    },
    [indexPattern, fetch]
  );

  useEffect(() => {
    loadIndexFields();
  }, [indexPattern, loadIndexFields]);

  const derivedDataView = useMemo(
    () => ({
      fields,
      title,
    }),
    [fields, title]
  );

  return derivedDataView;
};

function useKibanaFetch() {
  const kibana = useKibanaContextForPlugin();
  const fetch = kibana.services.http?.fetch;

  if (!fetch) {
    throw new Error('Kibana HTTP fetch not available');
  }

  return fetch;
}
