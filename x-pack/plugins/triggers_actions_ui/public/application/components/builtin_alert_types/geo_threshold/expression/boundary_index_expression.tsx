/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {Fragment, useEffect, useState} from 'react';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AlertTypeParamsExpressionProps } from '../../../../../types';
import {GeoThresholdAlertParams, TrackingEvent, ES_GEO_FIELD_TYPES, ES_GEO_SHAPE_TYPES} from '../types';
import { AlertsContextValue } from '../../../../context/alerts_context';
import { firstFieldOption } from '../../../../../common/index_controls';
import { GeoIndexPatternSelect } from './geo_index_pattern_select';
import { SingleFieldSelect } from './single_field_select';
import { ExpressionWithPopover } from './expression_with_popover';

const DEFAULT_VALUES = {
  TRACKING_EVENT: TrackingEvent.entered,
  ENTITY: '',
  INDEX: '',
  DATE_FIELD: '',
  SHAPES_ARR: [],
  TYPE: '',
  GEO_FIELD: '',
};

export const BoundaryIndexExpression: React.FunctionComponent<AlertTypeParamsExpressionProps<
  GeoThresholdAlertParams,
  AlertsContextValue
>> = ({
  alertParams,
  alertsContext,
  errors,
  setShapesArr,
  boundaryIndexPattern,
  setBoundaryIndexPattern,
}) => {
  const { dataUi, dataIndexPatterns, http } = alertsContext;
  const { IndexPatternSelect } = dataUi;

  const [boundaryGeoField, setBoundaryGeoField] = useState('');

  const indexPopover = (
    <Fragment>
      <EuiFormRow
        id="geoIndexPatternSelect"
        fullWidth
        isInvalid={false /* TODO: Determine error conditions */}
        error={errors.index}
      >
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
        label={i18n.translate('xpack.maps.source.esSearch.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.source.esSearch.selectLabel', {
            defaultMessage: 'Select geo field',
          })}
          value={boundaryGeoField}
          onChange={setBoundaryGeoField}
          fields={boundaryIndexPattern.fields.filter((field) =>
            ES_GEO_SHAPE_TYPES.includes(field.spec.type)
          )}
        />
      </EuiFormRow>
    </Fragment>
  );

  return (
    <ExpressionWithPopover
      defaultValue={'Select an index pattern and geo shape field'}
      value={boundaryIndexPattern.title}
      popoverContent={indexPopover}
      expressionDescription={i18n.translate(
        'xpack.triggersActionsUI.sections.alertAdd.geoThreshold.indexLabel',
        {
          defaultMessage: 'index',
        }
      )}
    />
  );
};
