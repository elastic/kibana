/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { FieldName } from '../../../common';
import { IFieldsMetadataClient } from '../../services/fields_metadata';

interface UseFieldsMetadataFactoryDeps {
  fieldsMetadataClient: IFieldsMetadataClient;
}

interface Params {
  fieldNames: FieldName[];
}

export const createUseFieldsMetadataHook = ({
  fieldsMetadataClient,
}: UseFieldsMetadataFactoryDeps) => {
  return ({ fieldNames }: Params) => {
    const [{ error, loading, value: fieldsMetadata }, load] = useAsyncFn(
      () => fieldsMetadataClient.find({ fieldNames }),
      [fieldNames]
    );

    useEffect(() => {
      load();
    }, [load]);

    return { fieldsMetadata, loading, error };
  };
};
