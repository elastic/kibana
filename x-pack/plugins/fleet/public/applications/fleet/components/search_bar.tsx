/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';

import { fromKueryExpression } from '@kbn/es-query';

import type { IFieldType } from '../../../../../../../src/plugins/data/public';
import { QueryStringInput } from '../../../../../../../src/plugins/data/public';
import { useStartServices } from '../hooks';
import { INDEX_NAME, AGENT_SAVED_OBJECT_TYPE } from '../constants';

const HIDDEN_FIELDS = [`${AGENT_SAVED_OBJECT_TYPE}.actions`, '_id', '_index'];

interface Props {
  value: string;
  fieldPrefix?: string;
  onChange: (newValue: string, submit?: boolean) => void;
  placeholder?: string;
  indexPattern?: string;
}

export const SearchBar: React.FunctionComponent<Props> = ({
  value,
  fieldPrefix,
  onChange,
  placeholder,
  indexPattern = INDEX_NAME,
}) => {
  const { data } = useStartServices();
  const [indexPatternFields, setIndexPatternFields] = useState<IFieldType[]>();

  const isQueryValid = useMemo(() => {
    if (!value || value === '') {
      return true;
    }

    try {
      fromKueryExpression(value);
      return true;
    } catch (e) {
      return false;
    }
  }, [value]);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const _fields: IFieldType[] = await data.indexPatterns.getFieldsForWildcard({
          pattern: indexPattern,
        });
        const fields = (_fields || []).filter((field) => {
          if (!fieldPrefix || field.name.startsWith(fieldPrefix)) {
            for (const hiddenField of HIDDEN_FIELDS) {
              if (field.name.startsWith(hiddenField)) {
                return false;
              }
            }
            return true;
          }
        });
        setIndexPatternFields(fields);
      } catch (err) {
        setIndexPatternFields(undefined);
      }
    };
    fetchFields();
  }, [data.indexPatterns, fieldPrefix, indexPattern]);

  return (
    <QueryStringInput
      iconType="search"
      disableLanguageSwitcher={true}
      indexPatterns={
        indexPatternFields
          ? [
              {
                title: indexPattern,
                fields: indexPatternFields,
              },
            ]
          : []
      }
      query={{
        query: value,
        language: 'kuery',
      }}
      isInvalid={!isQueryValid}
      disableAutoFocus={true}
      placeholder={placeholder}
      onChange={(newQuery) => {
        onChange(newQuery.query as string);
      }}
      onSubmit={(newQuery) => {
        onChange(newQuery.query as string, true);
      }}
      submitOnBlur
      isClearable
      autoSubmit
    />
  );
};
