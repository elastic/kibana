/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';
import type { EsqlColumn } from '../../../../common/descriptor_types';
import { getIndexPatternService } from '../../../kibana_services';
import { EsqlEditor } from './esql_editor';

interface Props {

}

export function CreateSourceEditor(props: Props) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [columns, setColumns] = useState<EsqlColumn[]>([]);
  const [esql, setEsql] = useState('');
  const [dateField, setDateField] = useState<string | undefined>();
  const [geoField, setGeoField] = useState<string | undefined>();

  useEffect(() => {
    let ignore = false;
    getIndexPatternService().getDefaultDataView()
      .then((defaultDataView) => {
        if (!ignore) {
          setIsInitialized(true);
          if (defaultDataView) {
            const geoField = defaultDataView.fields.find((field) => {
              return ES_GEO_FIELD_TYPE.GEO_POINT === field.type;
            });
            if (geoField) {
              setEsql(`from ${defaultDataView.getIndexPattern()} | KEEP ${geoField.name} | limit 10000`);
            }
          }
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

  return (
    <EuiSkeletonText
        lines={3}
        isLoading={!isInitialized}
      >
      <EsqlEditor
        dateField={dateField}
        geoField={geoField}
        esql={esql}
        onEsqlChange={({ columns, esql }: { columns: EsqlColumn[], esql: string }) => {
          setColumns(columns);
          setEsql(esql);
        }}
        onDateFieldChange={setDateField}
        onGeoFieldChange={setGeoField}
      />
    </EuiSkeletonText>
  );
}