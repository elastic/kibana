/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent, useEffect, useRef } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  IErrorObject,
  AlertsContextValue,
  AlertTypeParamsExpressionProps,
} from '../../../../../../triggers_actions_ui/public';
import { ES_GEO_FIELD_TYPES } from '../../types';
import { GeoIndexPatternSelect } from '../util_components/geo_index_pattern_select';
import { SingleFieldSelect } from '../util_components/single_field_select';
import { ExpressionWithPopover } from '../util_components/expression_with_popover';
import { IFieldType } from '../../../../../../../../src/plugins/data/common/index_patterns/fields';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns';

interface Props {
  dateField: string;
  geoField: string;
  alertsContext: AlertsContextValue;
  errors: IErrorObject;
  setAlertParamsDate: (date: string) => void;
  setAlertParamsGeoField: (geoField: string) => void;
  setAlertProperty: AlertTypeParamsExpressionProps['setAlertProperty'];
  setIndexPattern: (indexPattern: IIndexPattern) => void;
  indexPattern: IIndexPattern;
  isInvalid: boolean;
}

export const EntityIndexExpression: FunctionComponent<Props> = ({
  setAlertParamsDate,
  setAlertParamsGeoField,
  errors,
  alertsContext,
  setIndexPattern,
  indexPattern,
  isInvalid,
  dateField: timeField,
  geoField,
}) => {
  const { dataUi, dataIndexPatterns, http } = alertsContext;
  const IndexPatternSelect = (dataUi && dataUi.IndexPatternSelect) || null;

  const usePrevious = <T extends unknown>(value: T): T | undefined => {
    const ref = useRef<T>();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  };

  const oldIndexPattern = usePrevious(indexPattern);
  const fields = useRef<{
    dateFields: IFieldType[];
    geoFields: IFieldType[];
  }>({
    dateFields: [],
    geoFields: [],
  });
  useEffect(() => {
    if (oldIndexPattern !== indexPattern) {
      fields.current.geoFields =
        (indexPattern.fields.length &&
          indexPattern.fields.filter((field: IFieldType) =>
            ES_GEO_FIELD_TYPES.includes(field.type)
          )) ||
        [];
      if (fields.current.geoFields.length) {
        setAlertParamsGeoField(fields.current.geoFields[0].name);
      }

      fields.current.dateFields =
        (indexPattern.fields.length &&
          indexPattern.fields.filter((field: IFieldType) => field.type === 'date')) ||
        [];
      if (fields.current.dateFields.length) {
        setAlertParamsDate(fields.current.dateFields[0].name);
      }
    }
  }, [indexPattern, oldIndexPattern, setAlertParamsDate, setAlertParamsGeoField]);

  const indexPopover = (
    <Fragment>
      <EuiFormRow id="geoIndexPatternSelect" fullWidth error={errors.index}>
        <GeoIndexPatternSelect
          onChange={(_indexPattern) => {
            // reset time field and expression fields if indices are deleted
            if (!_indexPattern) {
              return;
            }
            setIndexPattern(_indexPattern);
          }}
          value={indexPattern.id}
          IndexPatternSelectComponent={IndexPatternSelect}
          indexPatternService={dataIndexPatterns}
          http={http}
          includedGeoTypes={ES_GEO_FIELD_TYPES}
        />
      </EuiFormRow>
      <EuiFormRow
        id="containmentTimeField"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.stackAlerts.geoContainment.timeFieldLabel"
            defaultMessage="Time field"
          />
        }
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.stackAlerts.geoContainment.selectTimeLabel', {
            defaultMessage: 'Select time field',
          })}
          value={timeField}
          onChange={(_timeField: string | undefined) =>
            _timeField && setAlertParamsDate(_timeField)
          }
          fields={fields.current.dateFields}
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
          placeholder={i18n.translate('xpack.stackAlerts.geoContainment.selectGeoLabel', {
            defaultMessage: 'Select geo field',
          })}
          value={geoField}
          onChange={(_geoField: string | undefined) =>
            _geoField && setAlertParamsGeoField(_geoField)
          }
          fields={fields.current.geoFields}
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
      expressionDescription={i18n.translate('xpack.stackAlerts.geoContainment.entityIndexLabel', {
        defaultMessage: 'index',
      })}
    />
  );
};
