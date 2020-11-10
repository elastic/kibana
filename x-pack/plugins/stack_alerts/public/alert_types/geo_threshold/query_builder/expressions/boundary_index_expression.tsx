/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent, useEffect, useRef } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IErrorObject, AlertsContextValue } from '../../../../../../triggers_actions_ui/public';
import { ES_GEO_SHAPE_TYPES, GeoThresholdAlertParams } from '../../types';
import { GeoIndexPatternSelect } from '../util_components/geo_index_pattern_select';
import { SingleFieldSelect } from '../util_components/single_field_select';
import { ExpressionWithPopover } from '../util_components/expression_with_popover';
import { IFieldType } from '../../../../../../../../src/plugins/data/common/index_patterns/fields';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns';

interface Props {
  alertParams: GeoThresholdAlertParams;
  alertsContext: AlertsContextValue;
  errors: IErrorObject;
  boundaryIndexPattern: IIndexPattern;
  boundaryNameField?: string;
  setBoundaryIndexPattern: (boundaryIndexPattern?: IIndexPattern) => void;
  setBoundaryGeoField: (boundaryGeoField?: string) => void;
  setBoundaryNameField: (boundaryNameField?: string) => void;
}

export const BoundaryIndexExpression: FunctionComponent<Props> = ({
  alertParams,
  alertsContext,
  errors,
  boundaryIndexPattern,
  boundaryNameField,
  setBoundaryIndexPattern,
  setBoundaryGeoField,
  setBoundaryNameField,
}) => {
  const BOUNDARY_NAME_ENTITY_TYPES = ['string', 'number', 'ip'];
  const { dataUi, dataIndexPatterns, http } = alertsContext;
  const IndexPatternSelect = (dataUi && dataUi.IndexPatternSelect) || null;
  const { boundaryGeoField } = alertParams;
  const nothingSelected: IFieldType = {
    name: '<nothing selected>',
    type: 'string',
  };

  const usePrevious = <T extends unknown>(value: T): T | undefined => {
    const ref = useRef<T>();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  };

  const oldIndexPattern = usePrevious(boundaryIndexPattern);
  const fields = useRef<{
    geoFields: IFieldType[];
    boundaryNameFields: IFieldType[];
  }>({
    geoFields: [],
    boundaryNameFields: [],
  });
  useEffect(() => {
    if (oldIndexPattern !== boundaryIndexPattern) {
      fields.current.geoFields =
        (boundaryIndexPattern.fields.length &&
          boundaryIndexPattern.fields.filter((field: IFieldType) =>
            ES_GEO_SHAPE_TYPES.includes(field.type)
          )) ||
        [];
      if (fields.current.geoFields.length) {
        setBoundaryGeoField(fields.current.geoFields[0].name);
      }

      fields.current.boundaryNameFields = [
        ...boundaryIndexPattern.fields.filter((field: IFieldType) => {
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
          indexPatternService={dataIndexPatterns}
          http={http}
          includedGeoTypes={ES_GEO_SHAPE_TYPES}
        />
      </EuiFormRow>
      <EuiFormRow
        id="geoField"
        fullWidth
        label={i18n.translate('xpack.stackAlerts.geoThreshold.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.stackAlerts.geoThreshold.selectLabel', {
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
        label={i18n.translate('xpack.stackAlerts.geoThreshold.boundaryNameSelectLabel', {
          defaultMessage: 'Human-readable boundary name (optional)',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.stackAlerts.geoThreshold.boundaryNameSelect', {
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
      defaultValue={'Select an index pattern and geo shape field'}
      value={boundaryIndexPattern.title}
      popoverContent={indexPopover}
      expressionDescription={i18n.translate('xpack.stackAlerts.geoThreshold.indexLabel', {
        defaultMessage: 'index',
      })}
    />
  );
};
