/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { FindFieldsMetadataResponsePayload } from '../../../common/latest';
import { FieldName } from '../../../common';
import { IFieldsMetadataClient } from '../../services/fields_metadata';

interface UseFieldsMetadataFactoryDeps {
  fieldsMetadataClient: IFieldsMetadataClient;
}

interface UseFieldsMetadataParams {
  fieldNames: FieldName[];
}

interface UseFieldsMetadataReturnType {
  fieldsMetadata: FindFieldsMetadataResponsePayload['fields'] | undefined;
  loading: boolean;
  error: Error | undefined;
}

export type UseFieldsMetadataHook = (
  params: UseFieldsMetadataParams
) => UseFieldsMetadataReturnType;

export const createUseFieldsMetadataHook = ({
  fieldsMetadataClient,
}: UseFieldsMetadataFactoryDeps): UseFieldsMetadataHook => {
  return ({ fieldNames }) => {
    const serializedFieldNames = JSON.stringify(fieldNames);

    const [{ error, loading, value }, load] = useAsyncFn(
      () => fieldsMetadataClient.find({ fieldNames }),
      [serializedFieldNames]
    );

    useEffect(() => {
      load();
    }, [load]);

    return { fieldsMetadata: value?.fields, loading, error };
  };
};
