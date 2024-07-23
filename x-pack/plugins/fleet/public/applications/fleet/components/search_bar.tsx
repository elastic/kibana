/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { fromKueryExpression } from '@kbn/es-query';

import type { FieldSpec } from '@kbn/data-plugin/common';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

import { i18n } from '@kbn/i18n';

import { useStartServices } from '../hooks';
import {
  AGENT_POLICY_MAPPINGS,
  AGENT_MAPPINGS,
  ENROLLMENT_API_KEY_MAPPINGS,
  AGENTS_INDEX,
  ENROLLMENT_API_KEYS_INDEX,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  INGEST_SAVED_OBJECT_INDEX,
} from '../constants';

const NoWrapQueryStringInput = styled(QueryStringInput)`
  .kbnQueryBar__textarea {
    white-space: nowrap;
  }
`;

interface Props {
  value: string;
  indexPattern: string;
  fieldPrefix: string;
  onChange: (newValue: string, submit?: boolean) => void;
  placeholder?: string;
  dataTestSubj?: string;
}

const getMappings = (indexPattern: string, fieldPrefix: string) => {
  switch (indexPattern) {
    case AGENTS_INDEX:
      return AGENT_MAPPINGS;
    // Saved Objects are stored in .kibana_ingest.
    // Currently, the search bar is only used to query agent policies.
    case INGEST_SAVED_OBJECT_INDEX:
      switch (fieldPrefix) {
        case AGENT_POLICY_SAVED_OBJECT_TYPE:
          return AGENT_POLICY_MAPPINGS;
        default:
          return {};
      }
    case ENROLLMENT_API_KEYS_INDEX:
      return ENROLLMENT_API_KEY_MAPPINGS;
    default:
      return {};
  }
};

const getFieldName = (indexPattern: string, fieldPrefix: string, name: string) => {
  // Add Saved Object prefix if the field refers to a SO and is not already prefixed.
  if (indexPattern !== INGEST_SAVED_OBJECT_INDEX || name.startsWith(fieldPrefix)) {
    return name;
  }
  return `${fieldPrefix}.${name}`;
};

const getFieldType = (type: string) => {
  switch (type) {
    case 'keyword':
      return 'string';
    case 'text':
      return 'string';
    case 'version':
      return 'string';
    case 'integer':
      return 'number';
    case 'double':
      return 'number';
    default:
      return type;
  }
};

const concatKeys = (obj: any, parentKey = '') => {
  let result: string[] = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      result = result.concat(concatKeys(obj[key], `${parentKey}${key}.`));
    } else {
      result.push(`${parentKey}${key}:${obj[key]}`);
    }
  }
  return result;
};

/** Exported for testing only **/
export const getFieldSpecs = (indexPattern: string, fieldPrefix: string) => {
  const mapping = getMappings(indexPattern, fieldPrefix);
  // @ts-ignore-next-line
  const rawFields = concatKeys(mapping?.properties) || [];
  const fields = rawFields
    .map((field) => field.replaceAll(/.properties/g, ''))
    .map((field) => field.replace(/.type/g, ''))
    .map((field) => field.split(':'));

  const fieldSpecs: FieldSpec[] = fields.map((field) => {
    return {
      name: getFieldName(indexPattern, fieldPrefix, field[0]),
      type: getFieldType(field[1]),
      searchable: true,
      aggregatable: true,
      esTypes: [field[1]],
    };
  });
  return fieldSpecs;
};

export const SearchBar: React.FunctionComponent<Props> = ({
  value,
  fieldPrefix,
  onChange,
  placeholder,
  indexPattern,
  dataTestSubj,
}) => {
  const {
    data,
    dataViews,
    unifiedSearch,
    storage,
    notifications,
    http,
    docLinks,
    uiSettings,
    usageCollection,
  } = useStartServices();

  const [dataView, setDataView] = useState<DataView | undefined>();

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
        const fieldSpecs = getFieldSpecs(indexPattern, fieldPrefix);
        const fieldsMap = data.dataViews.fieldArrayToMap(fieldSpecs);
        const newDataView = await data.dataViews.create(
          { title: indexPattern, fields: fieldsMap },
          true
        );
        setDataView(newDataView);
      } catch (err) {
        setDataView(undefined);
      }
    };
    fetchFields();
  }, [data.dataViews, fieldPrefix, indexPattern]);

  return (
    <NoWrapQueryStringInput
      iconType="search"
      disableLanguageSwitcher={true}
      indexPatterns={dataView ? [dataView] : []}
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
      appName={i18n.translate('xpack.fleet.appTitle', { defaultMessage: 'Fleet' })}
      deps={{
        unifiedSearch,
        notifications,
        http,
        docLinks,
        uiSettings,
        data,
        dataViews,
        storage,
        usageCollection,
      }}
      {...(dataTestSubj && { dataTestSubj })}
    />
  );
};
