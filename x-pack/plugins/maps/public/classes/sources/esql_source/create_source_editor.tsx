/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import type { ESQLColumn } from '@kbn/es-types';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import {
  EuiFormRow,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';
import type { ESQLSourceDescriptor } from '../../../../common/descriptor_types';
import { getIndexPatternService } from '../../../kibana_services';
import { ESQLEditor } from './esql_editor';
import { NarrowByMapBounds, NarrowByTime } from './narrow_by_field';
import { ESQL_GEO_POINT_TYPE, ESQL_GEO_SHAPE_TYPE } from './esql_utils';

interface Props {
  mostCommonDataViewId?: string;
  onSourceConfigChange: (sourceConfig: Partial<ESQLSourceDescriptor> | null) => void;
}

export function CreateSourceEditor(props: Props) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [adhocDataViewId, setAdhocDataViewId] = useState<string | undefined>();
  const [columns, setColumns] = useState<ESQLColumn[]>([]);
  const [esql, setEsql] = useState('');
  const [dateField, setDateField] = useState<string | undefined>();
  const [dateFields, setDateFields] = useState<string[]>([]);
  const [geoField, setGeoField] = useState<string | undefined>();
  const [geoFields, setGeoFields] = useState<string[]>([]);
  const [narrowByGlobalSearch, setNarrowByGlobalSearch] = useState(true);
  const [narrowByGlobalTime, setNarrowByGlobalTime] = useState(true);
  const [narrowByMapBounds, setNarrowByMapBounds] = useState(true);

  useEffect(() => {
    let ignore = false;

    function getDataView() {
      return props.mostCommonDataViewId
        ? getIndexPatternService().get(props.mostCommonDataViewId)
        : getIndexPatternService().getDefaultDataView();
    }

    getDataView()
      .then(async (dataView) => {
        const adhocDataView = dataView
          ? await getESQLAdHocDataview(
              `from ${dataView.getIndexPattern()}`,
              getIndexPatternService()
            )
          : undefined;
        if (ignore) {
          return;
        }

        if (adhocDataView) {
          let initialGeoField: DataViewField | undefined;
          const initialDateFields: string[] = [];
          const initialGeoFields: string[] = [];
          for (let i = 0; i < adhocDataView.fields.length; i++) {
            const field = adhocDataView.fields[i];
            if (
              [ES_GEO_FIELD_TYPE.GEO_POINT, ES_GEO_FIELD_TYPE.GEO_SHAPE].includes(
                field.type as ES_GEO_FIELD_TYPE
              )
            ) {
              initialGeoFields.push(field.name);
              if (!initialGeoField) initialGeoField = field;
            } else if ('date' === field.type) {
              initialDateFields.push(field.name);
            }
          }

          if (initialGeoField) {
            let initialDateField: string | undefined;
            // get default time field from default data view instead of adhoc data view
            if (dataView?.timeFieldName) {
              initialDateField = dataView.timeFieldName;
            } else if (initialDateFields.length) {
              initialDateField = initialDateFields[0];
            }
            const initialEsql = `from ${adhocDataView.getIndexPattern()} | keep ${
              initialGeoField.name
            } | limit 10000`;
            setColumns([
              {
                name: initialGeoField.name,
                type:
                  initialGeoField.type === ES_GEO_FIELD_TYPE.GEO_SHAPE
                    ? ESQL_GEO_SHAPE_TYPE
                    : ESQL_GEO_POINT_TYPE,
              },
            ]);
            setAdhocDataViewId(adhocDataView.id);
            setDateField(initialDateField);
            setDateFields(initialDateFields);
            setGeoField(initialGeoField.name);
            setGeoFields(initialGeoFields);
            setEsql(initialEsql);
            if (!initialDateField) {
              setNarrowByGlobalTime(false);
            }
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

  useDebounce(
    () => {
      const sourceConfig =
        esql && esql.length && adhocDataViewId
          ? {
              columns,
              dataViewId: adhocDataViewId,
              dateField,
              geoField,
              esql,
              narrowByGlobalSearch,
              narrowByGlobalTime,
              narrowByMapBounds,
            }
          : null;
      props.onSourceConfigChange(sourceConfig);
    },
    0,
    [
      adhocDataViewId,
      columns,
      dateField,
      geoField,
      esql,
      narrowByGlobalSearch,
      narrowByGlobalTime,
      narrowByMapBounds,
    ]
  );

  return (
    <EuiPanel>
      <EuiSkeletonText lines={3} isLoading={!isInitialized}>
        <ESQLEditor
          esql={esql}
          onESQLChange={(change) => {
            setAdhocDataViewId(change.adhocDataViewId);
            setColumns(change.columns);
            setEsql(change.esql);
            setDateFields(change.dateFields);
            setGeoFields(change.geoFields);

            if (!dateField || !change.dateFields.includes(dateField)) {
              if (change.dateFields.length) {
                setDateField(change.dateFields[0]);
              } else {
                setDateField(undefined);
                setNarrowByGlobalTime(false);
              }
            }

            if (!geoField || !change.geoFields.includes(geoField)) {
              if (change.geoFields.length) {
                setGeoField(change.geoFields[0]);
              } else {
                setGeoField(undefined);
                setNarrowByMapBounds(false);
              }
            }
          }}
        />

        {esql && (
          <>
            <EuiSpacer size="m" />

            <NarrowByMapBounds
              esql={esql}
              field={geoField}
              fields={geoFields}
              narrowByField={narrowByMapBounds}
              onFieldChange={(fieldName: string) => {
                setGeoField(fieldName);
              }}
              onNarrowByFieldChange={(narrowByField: boolean) => {
                setNarrowByMapBounds(narrowByField);
                // auto select first geo field when enabling narrowByMapBounds and geoField is not set
                if (narrowByField && geoFields.length && !!geoField) {
                  setGeoField(geoFields[0]);
                }
              }}
            />

            <EuiFormRow>
              <EuiSwitch
                label={i18n.translate('xpack.maps.esqlSource.narrowByGlobalSearchLabel', {
                  defaultMessage: `Apply global search to ES|QL statement`,
                })}
                checked={narrowByGlobalSearch}
                onChange={(event: EuiSwitchEvent) => {
                  setNarrowByGlobalSearch(event.target.checked);
                }}
                compressed
              />
            </EuiFormRow>

            <NarrowByTime
              esql={esql}
              field={dateField}
              fields={dateFields}
              narrowByField={narrowByGlobalTime}
              onFieldChange={(fieldName: string) => {
                setDateField(fieldName);
              }}
              onNarrowByFieldChange={(narrowByField: boolean) => {
                setNarrowByGlobalTime(narrowByField);
                // auto select first geo field when enabling narrowByMapBounds and geoField is not set
                if (narrowByField && dateFields.length && !!dateField) {
                  setDateField(dateFields[0]);
                }
              }}
            />
          </>
        )}
      </EuiSkeletonText>
    </EuiPanel>
  );
}
