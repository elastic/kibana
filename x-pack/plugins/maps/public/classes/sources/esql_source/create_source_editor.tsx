/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';
import type { ESQLSourceDescriptor } from '../../../../common/descriptor_types';
import { getIndexPatternService } from '../../../kibana_services';
import { ESQLEditor } from './esql_editor';
import { ESQL_GEO_POINT_TYPE, ESQL_GEO_SHAPE_TYPE } from './esql_utils';

interface Props {
  mostCommonDataViewId?: string;
  onSourceConfigChange: (sourceConfig: Partial<ESQLSourceDescriptor> | null) => void;
}

export function CreateSourceEditor(props: Props) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [esql, setEsql] = useState('');
  const [dateField, setDateField] = useState<string | undefined>();

  useEffect(() => {
    let ignore = false;

    function getDataView() {
      return props.mostCommonDataViewId
        ? getIndexPatternService().get(props.mostCommonDataViewId)
        : getIndexPatternService().getDefaultDataView();
    }

    getDataView()
      .then((dataView) => {
        if (ignore) {
          return;
        }

        if (dataView) {
          let geoField: DataViewField | undefined;
          const initialDateFields: string[] = [];
          for (let i = 0; i < dataView.fields.length; i++) {
            const field = dataView.fields[i];
            if (
              !geoField &&
              [ES_GEO_FIELD_TYPE.GEO_POINT, ES_GEO_FIELD_TYPE.GEO_SHAPE].includes(
                field.type as ES_GEO_FIELD_TYPE
              )
            ) {
              geoField = field;
            } else if ('date' === field.type) {
              initialDateFields.push(field.name);
            }
          }

          if (geoField) {
            let initialDateField: string | undefined;
            if (dataView.timeFieldName) {
              initialDateField = dataView.timeFieldName;
            } else if (initialDateFields.length) {
              initialDateField = initialDateFields[0];
            }
            const initialEsql = `from ${dataView.getIndexPattern()} | keep ${
              geoField.name
            } | limit 10000`;
            setDateField(initialDateField);
            setEsql(initialEsql);
            props.onSourceConfigChange({
              columns: [
                {
                  name: geoField.name,
                  type:
                    geoField.type === ES_GEO_FIELD_TYPE.GEO_SHAPE
                      ? ESQL_GEO_SHAPE_TYPE
                      : ESQL_GEO_POINT_TYPE,
                },
              ],
              dateField: initialDateField,
              esql: initialEsql,
            });
          }
        }
        setIsInitialized(true);
      })
      .catch((err) => {
        if (ignore) {
          return;
        }
        setIsInitialized(true);
      });

    return () => {
      ignore = true;
    };
    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiSkeletonText lines={3} isLoading={!isInitialized}>
      <ESQLEditor
        esql={esql}
        onESQLChange={(change: {
          columns: ESQLSourceDescriptor['columns'];
          dateFields: string[];
          esql: string;
        }) => {
          let nextDateField = dateField;
          if (!dateField || !change.dateFields.includes(dateField)) {
            nextDateField = change.dateFields.length ? change.dateFields[0] : undefined;
          }
          setDateField(nextDateField);
          setEsql(change.esql);
          const sourceConfig =
            change.esql && change.esql.length
              ? {
                  columns: change.columns,
                  dateField: nextDateField,
                  esql: change.esql,
                }
              : null;
          props.onSourceConfigChange(sourceConfig);
        }}
      />
    </EuiSkeletonText>
  );
}
