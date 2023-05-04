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
import { INDEX_NAME, AGENTS_PREFIX } from '../constants';

const HIDDEN_FIELDS = [`${AGENTS_PREFIX}.actions`, '_id', '_index'];

const NoWrapQueryStringInput = styled(QueryStringInput)`
  .kbnQueryBar__textarea {
    white-space: nowrap;
  }
`;

interface Props {
  value: string;
  fieldPrefix?: string;
  onChange: (newValue: string, submit?: boolean) => void;
  placeholder?: string;
  indexPattern?: string;
  dataTestSubj?: string;
}

export const SearchBar: React.FunctionComponent<Props> = ({
  value,
  fieldPrefix,
  onChange,
  placeholder,
  indexPattern = INDEX_NAME,
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
        const _fields: FieldSpec[] = await data.dataViews.getFieldsForWildcard({
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
        const fieldsMap = fields.reduce((acc: Record<string, FieldSpec>, curr: FieldSpec) => {
          acc[curr.name] = curr;
          return acc;
        }, {});
        const newDataView = await data.dataViews.create({ title: indexPattern, fields: fieldsMap });
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
