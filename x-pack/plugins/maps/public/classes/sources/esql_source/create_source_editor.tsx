/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { EuiSkeletonText } from '@elastic/eui';
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';
import type { ESQLSourceDescriptor } from '../../../../common/descriptor_types';
import { getIndexPatternService } from '../../../kibana_services';
import { ESQLEditor } from './esql_editor';

interface Props {
  onSourceConfigChange: (sourceConfig: Partial<ESQLSourceDescriptor> | null) => void;
}

export function CreateSourceEditor(props: Props) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [columns, setColumns] = useState<ESQLSourceDescriptor['columns']>([]);
  const [esql, setEsql] = useState('');
  const [dateField, setDateField] = useState<string | undefined>();
  const [dateFields, setDateFields] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;
    getIndexPatternService().getDefaultDataView()
      .then((defaultDataView) => {
        if (!ignore) {
          if (defaultDataView) {
            let geoField: string | undefined;
            const defaultDateFields: string[] = [];
            for (let i = 0; i < defaultDataView.fields.length; i++) {
              const field = defaultDataView.fields[i];
              if (!geoField && ES_GEO_FIELD_TYPE.GEO_POINT === field.type) {
                geoField = field.name;
              } else if ('date' === field.type) {
                dateFields.push(field.name);
              }
            }
            if (geoField) {
              if (defaultDataView.timeFieldName) {
                setDateField(defaultDataView.timeFieldName);
              }
              setDateFields(defaultDateFields);
              setEsql(`from ${defaultDataView.getIndexPattern()} | KEEP ${geoField} | limit 10000`);
            }
          }
          setIsInitialized(true);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setIsInitialized(true);
        }
      });
    return () => {
      ignore = true;
    };
    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dateField || !dateFields.includes(dateField)) {
      setDateField(dateFields.length ? dateFields[0] : undefined);
    }
  }, [dateFields]);

  const [, cancel] = useDebounce(
    () => {
      const sourceConfig = esql && esql.length
        ? {
            columns,
            esql,
            dateField,
          }
        : null;
      props.onSourceConfigChange(sourceConfig);
    },
    300,
    [columns, esql, dateField]
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return (
    <EuiSkeletonText
      lines={3}
      isLoading={!isInitialized}
    >
      <ESQLEditor
        esql={esql}
        onESQLChange={({ columns, dateFields, esql }: { columns: ESQLSourceDescriptor['columns'], dateFields: string[], esql: string }) => {
          setColumns(columns);
          setDateFields(dateFields);
          setEsql(esql);
        }}
      />
    </EuiSkeletonText>
  );
}