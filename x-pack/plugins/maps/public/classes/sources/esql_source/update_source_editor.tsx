/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFormRow,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIndexPatternFromESQLQuery } from '@kbn/es-query';
import type { ESQLSourceDescriptor } from '../../../../common/descriptor_types';
import type { OnSourceChangeArgs } from '../source';
import { ForceRefreshCheckbox } from '../../../components/force_refresh_checkbox';
import { ESQLEditor } from './esql_editor';
import { NarrowByField } from './narrow_by_field';
import { getFields } from './esql_utils';

interface Props {
  onChange(...args: OnSourceChangeArgs[]): void;
  sourceDescriptor: ESQLSourceDescriptor;
}

export function UpdateSourceEditor(props: Props) {
  const [dateFields, setDateFields] = useState<string[]>([]);
  const [geoFields, setGeoFields] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let ignore = false;
    getFields(props.sourceDescriptor.esql)
      .then((fields) => {
        if (ignore) {
          return;
        }
        setDateFields(fields.dateFields);
        setGeoFields(fields.geoFields);
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
    <>
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            {i18n.translate('xpack.maps.esqlSearch.sourceEditorTitle', {
              defaultMessage: 'ES|QL',
            })}
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiSkeletonText lines={3} isLoading={!isInitialized}>
          <ESQLEditor
            esql={props.sourceDescriptor.esql}
            onESQLChange={(change) => {
              setDateFields(change.dateFields);
              setGeoFields(change.geoFields);
              const changes: OnSourceChangeArgs[] = [
                { propName: 'columns', value: change.columns },
                { propName: 'esql', value: change.esql },
              ];
              if (
                props.sourceDescriptor.dateField &&
                !change.dateFields.includes(props.sourceDescriptor.dateField)
              ) {
                const autoSelectedDateField = change.dateFields.length ? change.dateFields[0] : undefined;
                changes.push({
                  propName: 'dateField',
                  value: autoSelectedDateField,
                });
                if (!autoSelectedDateField) {
                  changes.push({ propName: 'narrowByGlobalTime', value: false });
                }
              }
              if (
                props.sourceDescriptor.geoField &&
                !change.geoFields.includes(props.sourceDescriptor.geoField)
              ) {
                const autoSelectedGeoField = change.geoFields.length ? change.geoFields[0] : undefined;
                changes.push({
                  propName: 'geoField',
                  value: autoSelectedGeoField,
                });
                if (!autoSelectedGeoField) {
                  changes.push({ propName: 'narrowByMapBounds', value: false });
                }
              }
              props.onChange(...changes);
            }}
          />

          <EuiSpacer size="m" />

          <NarrowByField
            switchLabel={i18n.translate('xpack.maps.esqlSource.narrowByMapExtentLabel', {
              defaultMessage: 'Narrow ES|QL statement by visible map area',
            })}
            noFieldsMessage={i18n.translate('xpack.maps.esqlSource.noGeoFieldsDisabledMsg', {
              defaultMessage: `No geospatial fields are available from index pattern: {pattern}.`,
              values: {
                pattern: getIndexPatternFromESQLQuery(props.sourceDescriptor.esql),
              },
            })}
            field={props.sourceDescriptor.geoField}
            fields={geoFields}
            narrowByField={props.sourceDescriptor.narrowByMapBounds}
            onFieldChange={(fieldName: string) => {
              props.onChange({ propName: 'geoField', value: fieldName });
            }}
            onNarrowByFieldChange={(narrowByField: boolean) => {
              const changes: OnSourceChangeArgs[] = [
                { propName: 'narrowByMapBounds', value: narrowByField }
              ];
              // auto select first geo field when enabling narrowByMapBounds and geoField is not set
              if (narrowByField && geoFields.length && !!props.sourceDescriptor.geoField) {
                changes.push({ propName: 'geoField', value: geoFields[0] });
              }
              props.onChange(...changes);
            }}
          />

          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('xpack.maps.esqlSource.narrowByGlobalSearchLabel', {
                defaultMessage: `Narrow ES|QL statement by global search`,
              })}
              checked={props.sourceDescriptor.narrowByGlobalSearch}
              onChange={(event: EuiSwitchEvent) => {
                props.onChange({ propName: 'narrowByGlobalSearch', value: event.target.checked });
              }}
              compressed
            />
          </EuiFormRow>

          <NarrowByField
            switchLabel={i18n.translate('xpack.maps.esqlSource.narrowByGlobalTimeLabel', {
              defaultMessage: `Narrow ES|QL statement by global time`,
            })}
            noFieldsMessage={i18n.translate('xpack.maps.esqlSource.noDateFieldsDisabledMsg', {
              defaultMessage: `No date fields are available from index pattern: {pattern}.`,
              values: {
                pattern: getIndexPatternFromESQLQuery(props.sourceDescriptor.esql),
              },
            })}
            field={props.sourceDescriptor.dateField}
            fields={dateFields}
            narrowByField={props.sourceDescriptor.narrowByGlobalTime}
            onFieldChange={(fieldName: string) => {
              props.onChange({ propName: 'dateField', value: fieldName });
            }}
            onNarrowByFieldChange={(narrowByField: boolean) => {
              const changes: OnSourceChangeArgs[] = [
                { propName: 'narrowByGlobalTime', value: narrowByField }
              ];
              // auto select first date field when enabling narrowByGlobalTime and dateField is not set
              if (narrowByField && dateFields.length && !!props.sourceDescriptor.dateField) {
                changes.push({ propName: 'dateField', value: dateFields[0] });
              }
              props.onChange(...changes);
            }}
          />

          <ForceRefreshCheckbox
            applyForceRefresh={props.sourceDescriptor.applyForceRefresh}
            setApplyForceRefresh={(applyForceRefresh: boolean) => {
              props.onChange({ propName: 'applyForceRefresh', value: applyForceRefresh });
            }}
          />
        </EuiSkeletonText>
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
}
