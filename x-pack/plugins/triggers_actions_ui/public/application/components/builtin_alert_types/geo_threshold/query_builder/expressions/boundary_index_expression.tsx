/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertTypeParamsExpressionProps } from '../../../../../../types';
import { GeoThresholdAlertParams, ES_GEO_SHAPE_TYPES } from '../../types';
import { AlertsContextValue } from '../../../../../context/alerts_context';
import { GeoIndexPatternSelect } from '../util_components/geo_index_pattern_select';
import { SingleFieldSelect } from '../util_components/single_field_select';
import { ExpressionWithPopover } from '../util_components/expression_with_popover';

export const BoundaryIndexExpression: React.FunctionComponent<AlertTypeParamsExpressionProps<
  GeoThresholdAlertParams,
  AlertsContextValue
>> = ({
  alertParams,
  alertsContext,
  errors,
  boundaryIndexPattern,
  setBoundaryIndexPattern,
  setBoundaryGeoField,
}) => {
  const { dataUi, dataIndexPatterns, http } = alertsContext;
  const { IndexPatternSelect } = dataUi;
  const { boundaryGeoField } = alertParams;

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
          geoTypes={ES_GEO_SHAPE_TYPES}
        />
      </EuiFormRow>
      <EuiFormRow
        id="geoField"
        fullWidth
        label={i18n.translate('xpack.triggersActionsUI.geoThreshold.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.triggersActionsUI.geoThreshold.selectLabel', {
            defaultMessage: 'Select geo field',
          })}
          value={boundaryGeoField}
          onChange={setBoundaryGeoField}
          fields={
            boundaryIndexPattern.fields.length &&
            boundaryIndexPattern.fields.filter((field) =>
              ES_GEO_SHAPE_TYPES.includes(field.spec.type)
            )
          }
        />
      </EuiFormRow>
    </Fragment>
  );

  return (
    <ExpressionWithPopover
      defaultValue={'Select an index pattern and geo shape field'}
      value={boundaryIndexPattern.title}
      popoverContent={indexPopover}
      expressionDescription={i18n.translate('xpack.triggersActionsUI.geoThreshold.indexLabel', {
        defaultMessage: 'index',
      })}
    />
  );
};
