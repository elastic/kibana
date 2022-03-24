/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FunctionComponent, useEffect, useRef } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { HttpSetup } from 'kibana/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { IErrorObject } from '../../../../../../triggers_actions_ui/public';
import { ES_GEO_SHAPE_TYPES, GeoContainmentAlertParams } from '../../types';
import { GeoIndexPatternSelect } from '../util_components/geo_index_pattern_select';
import { SingleFieldSelect } from '../util_components/single_field_select';
import { ExpressionWithPopover } from '../util_components/expression_with_popover';
import { DataViewField, DataView } from '../../../../../../../../src/plugins/data/common';

interface Props {
  ruleParams: GeoContainmentAlertParams;
  errors: IErrorObject;
  boundaryIndexPattern: DataView;
  boundaryNameField?: string;
  setBoundaryIndexPattern: (boundaryIndexPattern?: DataView) => void;
  setBoundaryGeoField: (boundaryGeoField?: string) => void;
  setBoundaryNameField: (boundaryNameField?: string) => void;
  data: DataPublicPluginStart;
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
}) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const BOUNDARY_NAME_ENTITY_TYPES = ['string', 'number', 'ip'];
  const { http } = useKibana<KibanaDeps>().services;
  const IndexPatternSelect = (data.ui && data.ui.IndexPatternSelect) || null;
  const { boundaryGeoField } = ruleParams;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nothingSelected: DataViewField = {
    name: '<nothing selected>',
    type: 'string',
  } as DataViewField;

  const usePrevious = <T extends unknown>(value: T): T | undefined => {
    const ref = useRef<T>();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  };

  const oldIndexPattern = usePrevious(boundaryIndexPattern);
  const fields = useRef<{
    geoFields: DataViewField[];
    boundaryNameFields: DataViewField[];
  }>({
    geoFields: [],
    boundaryNameFields: [],
  });
  useEffect(() => {
    if (oldIndexPattern !== boundaryIndexPattern) {
      fields.current.geoFields =
        (boundaryIndexPattern.fields &&
          boundaryIndexPattern.fields.length &&
          boundaryIndexPattern.fields.filter((field: DataViewField) =>
            ES_GEO_SHAPE_TYPES.includes(field.type)
          )) ||
        [];
      if (fields.current.geoFields.length) {
        setBoundaryGeoField(fields.current.geoFields[0].name);
      }

      fields.current.boundaryNameFields = [
        ...(boundaryIndexPattern.fields ?? []).filter((field: DataViewField) => {
          return (
            BOUNDARY_NAME_ENTITY_TYPES.includes(field.type) &&
            !field.name.startsWith('_') &&
            !field.name.endsWith('keyword')
          );
        }),
        nothingSelected,
      ];
      if (fields.current.boundaryNameFields.length) {
        setBoundaryNameField(fields.current.boundaryNameFields[0].name);
      }
    }
  }, [
    BOUNDARY_NAME_ENTITY_TYPES,
    boundaryIndexPattern,
    nothingSelected,
    oldIndexPattern,
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
          fields={fields.current.geoFields}
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
          fields={fields.current.boundaryNameFields}
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
