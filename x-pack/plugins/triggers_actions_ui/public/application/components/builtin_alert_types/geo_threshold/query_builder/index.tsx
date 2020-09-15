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
import { ExpressionWithPopover } from './util_components/expression_with_popover';
import { EntityIndexExpression } from './expressions/entity_index_expression';
import { EntityByExpression } from './expressions/entity_by_expression';
import { BoundaryIndexExpression } from './expressions/boundary_index_expression';

const DEFAULT_VALUES = {
  TRACKING_EVENT: '',
  ENTITY: '',
  INDEX_TITLE: '',
  INDEX_ID: '',
  DATE_FIELD: '',
  BOUNDARY_TYPE: 'entireIndex', // Only one supported currently. Will eventually be more
  GEO_FIELD: '',
  BOUNDARY_INDEX_TITLE: '',
  BOUNDARY_INDEX_ID: '',
  BOUNDARY_GEO_FIELD: '',
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
    indexTitle,
    indexId,
    geoField,
    entity,
    dateField,
    trackingEvent,
    boundaryType,
    boundaryIndexTitle,
    boundaryIndexId,
    boundaryGeoField,
  } = alertParams;

  const [indexPattern, _setIndexPattern] = useState({ id: '', fields: [] });
  const setIndexPattern = (_indexPattern) => {
    _setIndexPattern(_indexPattern);
    setAlertParams('indexTitle', _indexPattern.title);
    setAlertParams('indexId', _indexPattern.id);
  };
  const [boundaryIndexPattern, _setBoundaryIndexPattern] = useState({ id: '', fields: [] });
  const setBoundaryIndexPattern = (_indexPattern) => {
    _setBoundaryIndexPattern(_indexPattern);
    setAlertParams('boundaryIndexTitle', _indexPattern.title);
    setAlertParams('boundaryIndexId', _indexPattern.id);
  };

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
        indexTitle: indexTitle ?? DEFAULT_VALUES.INDEX_TITLE,
        indexId: indexId ?? DEFAULT_VALUES.INDEX_ID,
        entity: entity ?? DEFAULT_VALUES.ENTITY,
        dateField: dateField ?? DEFAULT_VALUES.DATE_FIELD,
        trackingEvent: trackingEvent ?? DEFAULT_VALUES.TRACKING_EVENT,
        boundaryType: boundaryType ?? DEFAULT_VALUES.BOUNDARY_TYPE,
        geoField: geoField ?? DEFAULT_VALUES.GEO_FIELD,
        boundaryIndexTitle: boundaryIndexTitle ?? DEFAULT_VALUES.BOUNDARY_INDEX_TITLE,
        boundaryIndexId: boundaryIndexId ?? DEFAULT_VALUES.BOUNDARY_INDEX_ID,
        boundaryGeoField: boundaryGeoField ?? DEFAULT_VALUES.BOUNDARY_GEO_FIELD,
      });
      if (indexId) {
        const _indexPattern = await alertsContext.dataIndexPatterns.get(indexId);
        setIndexPattern(_indexPattern);
      }
      if (boundaryIndexId) {
        const _boundaryIndexPattern = await alertsContext.dataIndexPatterns.get(boundaryIndexId);
        setBoundaryIndexPattern(_boundaryIndexPattern);
      }
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
            id="xpack.triggersActionsUI.sections.alertAdd.selectEntity"
            defaultMessage="Select entity:"
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
          indexId && geoField && dateField && entity
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
        boundaryIndexPattern={boundaryIndexPattern}
        setBoundaryIndexPattern={setBoundaryIndexPattern}
        setBoundaryGeoField={(_geoField) => setAlertParams('boundaryGeoField', _geoField)}
      />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { GeoThresholdAlertTypeExpression as default };
