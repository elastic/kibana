/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AlertTypeParamsExpressionProps } from '../../../../../../types';
import { GeoThresholdAlertParams, TrackingEvent, ES_GEO_FIELD_TYPES } from '../../types';
import { AlertsContextValue } from '../../../../../context/alerts_context';
import { firstFieldOption } from '../../../../../../common/index_controls';
import { GeoIndexPatternSelect } from '../util_components/geo_index_pattern_select';
import { SingleFieldSelect } from '../util_components/single_field_select';
import { ExpressionWithPopover } from '../util_components/expression_with_popover';

const DEFAULT_VALUES = {
  TRACKING_EVENT: TrackingEvent.entered,
  ENTITY: '',
  INDEX: '',
  DATE_FIELD: '',
  SHAPES_ARR: [],
  TYPE: '',
  GEO_FIELD: '',
};

export const EntityIndexExpression: React.FunctionComponent<AlertTypeParamsExpressionProps<
  GeoThresholdAlertParams,
  AlertsContextValue
>> = ({
  alertParams,
  setAlertParamsDate,
  setAlertParamsGeoField,
  setAlertProperty,
  errors,
  alertsContext,
  setIndexPattern,
  indexPattern,
  isInvalid,
}) => {
  const {
    trackingEvent,
    entity,
    index,
    dateField: timeField,
    shapesArr,
    type,
    geoField,
  } = alertParams;
  const { dataUi, dataIndexPatterns, http } = alertsContext;
  const { IndexPatternSelect } = dataUi;

  const setToDefaultParams = async () => {
    setAlertProperty('params', {
      ...alertParams,
      trackingEvent: trackingEvent ?? DEFAULT_VALUES.TRACKING_EVENT,
      entity: entity ?? DEFAULT_VALUES.ENTITY,
      index: index ?? DEFAULT_VALUES.INDEX,
      dateField: timeField ?? DEFAULT_VALUES.DATE_FIELD,
      shapesArr: shapesArr ?? DEFAULT_VALUES.SHAPES_ARR,
      type: type ?? DEFAULT_VALUES.TYPE,
      geoField: geoField ?? DEFAULT_VALUES.GEO_FIELD,
    });
  };

  useEffect(() => {
    setToDefaultParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indexPopover = (
    <Fragment>
      <EuiFormRow id="geoIndexPatternSelect" fullWidth error={errors.index}>
        <GeoIndexPatternSelect
          onChange={(_indexPattern) => {
            // reset time field and expression fields if indices are deleted
            if (!_indexPattern) {
              setToDefaultParams();
              return;
            }
            setIndexPattern(_indexPattern);
          }}
          value={indexPattern.id}
          IndexPatternSelectComponent={IndexPatternSelect}
          indexPatternService={dataIndexPatterns}
          http={http}
        />
      </EuiFormRow>
      <EuiFormRow
        id="thresholdTimeField"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.triggersActionsUI.geoThreshold.timeFieldLabel"
            defaultMessage="Time field"
          />
        }
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.triggersActionsUI.geoThreshold.selectTimeLabel', {
            defaultMessage: 'Select time field',
          })}
          value={timeField}
          onChange={(_timeField: string | undefined) => setAlertParamsDate(_timeField)}
          fields={
            indexPattern.fields.length &&
            indexPattern.fields.filter((field) => field.spec.type === 'date')
          }
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
          placeholder={i18n.translate('xpack.triggersActionsUI.geoThreshold.selectGeoLabel', {
            defaultMessage: 'Select geo field',
          })}
          value={geoField}
          onChange={(_geoField: string | undefined) => setAlertParamsGeoField(_geoField)}
          fields={
            indexPattern.fields.length &&
            indexPattern.fields.filter((field) => ES_GEO_FIELD_TYPES.includes(field.spec.type))
          }
        />
      </EuiFormRow>
    </Fragment>
  );

  return (
    <ExpressionWithPopover
      isInvalid={isInvalid}
      value={indexPattern.title}
      defaultValue={'Select an index pattern and geo shape/point field'}
      popoverContent={indexPopover}
      expressionDescription={i18n.translate(
        'xpack.triggersActionsUI.geoThreshold.entityIndexLabel',
        {
          defaultMessage: 'index',
        }
      )}
    />
  );
};
