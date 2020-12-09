/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  QueryStringInput,
  IFieldType,
  esKuery,
} from '../../../../../../../src/plugins/data/public';
import { useStartServices } from '../hooks';
import { INDEX_NAME, AGENT_SAVED_OBJECT_TYPE } from '../constants';

const HIDDEN_FIELDS = [`${AGENT_SAVED_OBJECT_TYPE}.actions`];

interface Props {
  value: string;
  fieldPrefix: string;
  onChange: (newValue: string, submit?: boolean) => void;
  placeholder?: string;
}

export const SearchBar: React.FunctionComponent<Props> = ({
  value,
  fieldPrefix,
  onChange,
  placeholder,
}) => {
  const { data } = useStartServices();
  const [indexPatternFields, setIndexPatternFields] = useState<IFieldType[]>();

  const isQueryValid = useMemo(() => {
    if (!value || value === '') {
      return true;
    }

    try {
      esKuery.fromKueryExpression(value);
      return true;
    } catch (e) {
      return false;
    }
  }, [value]);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const _fields: IFieldType[] = await data.indexPatterns.getFieldsForWildcard({
          pattern: INDEX_NAME,
        });
        const fields = (_fields || []).filter((field) => {
          if (fieldPrefix && field.name.startsWith(fieldPrefix)) {
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
  }, [data.indexPatterns, fieldPrefix]);

  return (
    <QueryStringInput
      iconType="search"
      disableLanguageSwitcher={true}
      indexPatterns={
        indexPatternFields
          ? [
              {
                title: INDEX_NAME,
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
    />
  );
};
