/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { EuiCallOut, EuiFormRow, EuiSelect, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AlertTypeParamsExpressionProps } from '../../../../../types';
import { GeoThresholdAlertParams, TrackingEvent } from '../types';
import { AlertsContextValue } from '../../../../context/alerts_context';
import { EntityIndexExpression } from './index_select_expressions/entity_index_expression';
import { EntityByExpression } from './index_select_expressions/entity_by_expression';
import { ExpressionWithPopover } from './expression_with_popover';
import { BoundaryIndexExpression } from './boundary_index_expression';

const DEFAULT_VALUES = {
  TRACKING_EVENT: '',
  ENTITY: '',
  INDEX: '',
  DATE_FIELD: '',
  SHAPES_ARR: [],
  TYPE: '',
  GEO_FIELD: '',
  WHERE_ENTITY: '',
  BOUNDARY_WHERE: '',
};

const conditionOptions = Object.keys(TrackingEvent).map((key) => ({
  text: TrackingEvent[key],
  value: TrackingEvent[key],
}));

export const GeoThresholdAlertTypeExpression: React.FunctionComponent<AlertTypeParamsExpressionProps<
  GeoThresholdAlertParams,
  AlertsContextValue
>> = ({ alertParams, alertInterval, setAlertParams, setAlertProperty, errors, alertsContext }) => {
  const {
    trackingEvent,
    entity,
    index,
    dateField: timeField,
    shapesArr,
    type,
    geoField,
    whereEntity,
    boundaryWhere,
  } = alertParams;

  const [indexPattern, _setIndexPattern] = useState({ id: '', fields: [] });
  const [indexFields, _setIndexFields] = useState([]);
  const setIndexPattern = (_indexPattern) => {
    _setIndexPattern(_indexPattern);
    _setIndexFields(_indexPattern.fields);
    setAlertParams('index', _indexPattern.title);
  };
  const [boundaryIndexPattern, setBoundaryIndexPattern] = useState({ id: '', fields: [] });

  const hasExpressionErrors = false;
  const expressionErrorMessage = i18n.translate(
    'xpack.triggersActionsUI.sections.alertAdd.geoThreshold.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  useEffect(() => {
    const initToDefaultParams = async () => {
      setAlertProperty('params', {
        ...alertParams,
        trackingEvent: trackingEvent ?? DEFAULT_VALUES.TRACKING_EVENT,
        entity: entity ?? DEFAULT_VALUES.ENTITY,
        index: index ?? DEFAULT_VALUES.INDEX,
        dateField: timeField ?? DEFAULT_VALUES.DATE_FIELD,
        shapesArr: shapesArr ?? DEFAULT_VALUES.SHAPES_ARR,
        type: type ?? DEFAULT_VALUES.TYPE,
        geoField: geoField ?? DEFAULT_VALUES.GEO_FIELD,
        whereEntity: whereEntity ?? DEFAULT_VALUES.WHERE_ENTITY,
        boundaryWhere: boundaryWhere ?? DEFAULT_VALUES.BOUNDARY_WHERE,
      });
    };
    initToDefaultParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      {hasExpressionErrors ? (
        <Fragment>
          <EuiSpacer />
          <EuiCallOut color="danger" size="s" title={expressionErrorMessage} />
          <EuiSpacer />
        </Fragment>
      ) : null}
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertAdd.selectIndex"
            defaultMessage="Select an index:"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EntityIndexExpression
        alertInterval={alertInterval}
        alertParams={alertParams}
        alertsContext={alertsContext}
        errors={errors}
        setAlertParamsDate={(date) => setAlertParams('dateField', date)}
        setAlertParamsGeoField={(_geoField) => setAlertParams('geoField', _geoField)}
        setAlertProperty={setAlertProperty}
        setIndexPattern={setIndexPattern}
        indexPattern={indexPattern}
      />
      <EntityByExpression
        errors={errors}
        entity={entity}
        setAlertParamsEntity={(entityName) => setAlertParams('entity', entityName)}
        indexFields={indexPattern.fields}
      />

      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertAdd.selectIndex"
            defaultMessage="Define the condition:"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ExpressionWithPopover
        defaultValue={
          index && geoField && timeField && entity
            ? conditionOptions[0].text
            : 'Select crossing option'
        }
        value={trackingEvent}
        popoverContent={
          <EuiFormRow
            id="someSelect"
            fullWidth
            isInvalid={false /* TODO: Determine error conditions */}
            error={errors.index}
          >
            <div>
              <EuiSelect
                data-test-subj="whenExpressionSelect"
                value={trackingEvent}
                fullWidth
                onChange={(e) => setAlertParams('trackingEvent', e.target.value)}
                options={conditionOptions}
              />
            </div>
          </EuiFormRow>
        }
        expressionDescription={i18n.translate(
          'xpack.triggersActionsUI.sections.alertAdd.geoThreshold.indexLabel',
          {
            defaultMessage: 'when entity',
          }
        )}
      />

      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertAdd.selectIndex"
            defaultMessage="Select boundary:"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <BoundaryIndexExpression
        alertParams={alertParams}
        alertsContext={alertsContext}
        errors={errors}
        setShapesArr={(_shapesArr) => setAlertParams('shapesArr', _shapesArr)}
        boundaryIndexPattern={boundaryIndexPattern}
        setBoundaryIndexPattern={setBoundaryIndexPattern}
      />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { GeoThresholdAlertTypeExpression as default };
