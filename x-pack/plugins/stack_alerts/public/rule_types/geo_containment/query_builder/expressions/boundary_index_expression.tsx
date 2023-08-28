/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FunctionComponent, useEffect, useRef, useState, useMemo } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { HttpSetup } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { DataViewField, DataView } from '@kbn/data-plugin/common';
import { ES_GEO_SHAPE_TYPES, GeoContainmentAlertParams } from '../../types';
import { GeoIndexPatternSelect } from '../util_components/geo_index_pattern_select';
import { SingleFieldSelect } from '../util_components/single_field_select';
import { ExpressionWithPopover } from '../util_components/expression_with_popover';

interface Props {
  ruleParams: GeoContainmentAlertParams;
  errors: IErrorObject;
  boundaryIndexPattern: DataView;
  boundaryNameField?: string;
  setBoundaryIndexPattern: (boundaryIndexPattern?: DataView) => void;
  setBoundaryGeoField: (boundaryGeoField?: string) => void;
  setBoundaryNameField: (boundaryNameField?: string) => void;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

interface KibanaDeps {
  http: HttpSetup;
}

export const BoundaryIndexExpression: FunctionComponent<Props> = ({
  ruleParams,
  errors,
  boundaryIndexPattern,
  boundaryNameField,
  setBoundaryIndexPattern,
  setBoundaryGeoField,
  setBoundaryNameField,
  data,
  unifiedSearch,
}) => {
  const { http } = useKibana<KibanaDeps>().services;
  const IndexPatternSelect = (unifiedSearch.ui && unifiedSearch.ui.IndexPatternSelect) || null;
  const { boundaryGeoField, operation } = ruleParams;

  const nothingSelected: DataViewField = useMemo(
    () =>
      ({
        name: '<nothing selected>',
        type: 'string',
      } as DataViewField),
    []
  );

  const usePrevious = <T extends unknown>(value: T): T | undefined => {
    const ref = useRef<T>();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  };

  const [geoFields, setGeoFields] = useState<DataViewField[]>([]);
  const [boundaryNameFields, setBoundaryNameFields] = useState<DataViewField[]>([]);
  const oldIndexPattern = usePrevious(boundaryIndexPattern);

  useEffect(() => {
    const BOUNDARY_NAME_ENTITY_TYPES = ['string', 'number', 'ip'];
    if (oldIndexPattern !== boundaryIndexPattern) {
      const newGeoFields = [
        ...(boundaryIndexPattern.fields ?? []).filter((field: DataViewField) =>
          ES_GEO_SHAPE_TYPES.includes(field.type)
        ),
      ];
      setGeoFields(newGeoFields);

      if (newGeoFields.length) {
        setBoundaryGeoField(newGeoFields[0].name);
      }

      const newBoundaryNameFields = [
        ...(boundaryIndexPattern.fields ?? []).filter((field: DataViewField) => {
          return (
            BOUNDARY_NAME_ENTITY_TYPES.includes(field.type) &&
            !field.name.startsWith('_') &&
            !field.name.endsWith('keyword')
          );
        }),
        nothingSelected,
      ];

      setBoundaryNameFields(newBoundaryNameFields);
      if (oldIndexPattern !== boundaryIndexPattern) {
        if (operation !== 'edit' && newBoundaryNameFields.length) {
          setBoundaryNameField(newBoundaryNameFields[0].name);
        }
      }
    }
  }, [
    boundaryIndexPattern,
    nothingSelected,
    oldIndexPattern,
    operation,
    setBoundaryGeoField,
    setBoundaryNameField,
  ]);

  const indexPopover = (
    <Fragment>
      <EuiFormRow id="geoIndexPatternSelect" fullWidth error={errors.index}>
        <GeoIndexPatternSelect
          onChange={(_indexPattern) => {
            if (!_indexPattern) {
              return;
            }
            setBoundaryIndexPattern(_indexPattern);
          }}
          value={boundaryIndexPattern.id}
          IndexPatternSelectComponent={IndexPatternSelect}
          indexPatternService={data.indexPatterns}
          http={http}
          includedGeoTypes={ES_GEO_SHAPE_TYPES}
        />
      </EuiFormRow>
      <EuiFormRow
        id="geoField"
        fullWidth
        label={i18n.translate('xpack.stackAlerts.geoContainment.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.stackAlerts.geoContainment.selectLabel', {
            defaultMessage: 'Select geo field',
          })}
          value={boundaryGeoField}
          onChange={setBoundaryGeoField}
          fields={geoFields}
        />
      </EuiFormRow>
      <EuiFormRow
        id="boundaryNameFieldSelect"
        fullWidth
        label={i18n.translate('xpack.stackAlerts.geoContainment.boundaryNameSelectLabel', {
          defaultMessage: 'Human-readable boundary name (optional)',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.stackAlerts.geoContainment.boundaryNameSelect', {
            defaultMessage: 'Select boundary name',
          })}
          value={boundaryNameField || null}
          onChange={(name) => {
            setBoundaryNameField(name === nothingSelected.name ? undefined : name);
          }}
          fields={boundaryNameFields}
        />
      </EuiFormRow>
    </Fragment>
  );

  return (
    <ExpressionWithPopover
      defaultValue={'Select a data view and geo shape field'}
      value={boundaryIndexPattern.title}
      popoverContent={indexPopover}
      expressionDescription={i18n.translate('xpack.stackAlerts.geoContainment.indexLabel', {
        defaultMessage: 'index',
      })}
    />
  );
};
