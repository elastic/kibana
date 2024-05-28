/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { FieldAttribute, FieldName } from '../../../common';
import { FindFieldsMetadataResponsePayload } from '../../../common/latest';
import { IFieldsMetadataClient } from '../../services/fields_metadata';

interface UseFieldsMetadataFactoryDeps {
  fieldsMetadataClient: IFieldsMetadataClient;
}

export interface UseFieldsMetadataParams {
  attributes?: FieldAttribute[];
  fieldNames?: FieldName[];
  integration?: string;
  dataset?: string;
}

export interface UseFieldsMetadataReturnType {
  fieldsMetadata: FindFieldsMetadataResponsePayload['fields'] | undefined;
  loading: boolean;
  error: Error | undefined;
  reload: ReturnType<typeof useAsyncFn>[1];
}

export type UseFieldsMetadataHook = (
  params?: UseFieldsMetadataParams,
  deps?: Parameters<typeof useAsyncFn>[1]
) => UseFieldsMetadataReturnType;

export const createUseFieldsMetadataHook = ({
  fieldsMetadataClient,
}: UseFieldsMetadataFactoryDeps): UseFieldsMetadataHook => {
  return (params = {}, deps) => {
    const [{ error, loading, value }, load] = useAsyncFn(
      () => fieldsMetadataClient.find(params),
      deps
    );

    useEffect(() => {
      load();
    }, [load]);

    return { fieldsMetadata: value?.fields, loading, error, reload: load };
  };
};
