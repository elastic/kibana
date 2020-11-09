/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';
import {
  EuiCallOut,
  EuiFieldNumber,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AlertTypeParamsExpressionProps } from '../../../../../types';
import { GeoThresholdAlertParams, TrackingEvent } from '../types';
import { AlertsContextValue } from '../../../../context/alerts_context';
import { ExpressionWithPopover } from './util_components/expression_with_popover';
import { EntityIndexExpression } from './expressions/entity_index_expression';
import { EntityByExpression } from './expressions/entity_by_expression';
import { BoundaryIndexExpression } from './expressions/boundary_index_expression';
import { IIndexPattern } from '../../../../../../../../../src/plugins/data/common/index_patterns';
import { getTimeOptions } from '../../../../../common/lib/get_time_options';

const DEFAULT_VALUES = {
  TRACKING_EVENT: '',
  ENTITY: '',
  INDEX: '',
  INDEX_ID: '',
  DATE_FIELD: '',
  BOUNDARY_TYPE: 'entireIndex', // Only one supported currently. Will eventually be more
  GEO_FIELD: '',
  BOUNDARY_INDEX: '',
  BOUNDARY_INDEX_ID: '',
  BOUNDARY_GEO_FIELD: '',
  BOUNDARY_NAME_FIELD: '',
  DELAY_OFFSET_WITH_UNITS: '0m',
};

const conditionOptions = Object.keys(TrackingEvent).map((key) => ({
  text: (TrackingEvent as any)[key],
  value: (TrackingEvent as any)[key],
}));

const labelForDelayOffset = (
  <>
    <FormattedMessage
      id="xpack.triggersActionsUI.geoThreshold.delayOffset"
      defaultMessage="Delayed evaluation offset"
    />{' '}
    <EuiIconTip
      position="right"
      type="questionInCircle"
      content={i18n.translate('xpack.triggersActionsUI.geoThreshold.delayOffsetTooltip', {
        defaultMessage: 'Evaluate alerts on a delayed cycle to adjust for data latency',
      })}
    />
  </>
);

export const GeoThresholdAlertTypeExpression: React.FunctionComponent<AlertTypeParamsExpressionProps<
  GeoThresholdAlertParams,
  AlertsContextValue
>> = ({ alertParams, alertInterval, setAlertParams, setAlertProperty, errors, alertsContext }) => {
  const {
    index,
    indexId,
    geoField,
    entity,
    dateField,
    trackingEvent,
    boundaryType,
    boundaryIndexTitle,
    boundaryIndexId,
    boundaryGeoField,
    boundaryNameField,
    delayOffsetWithUnits,
  } = alertParams;

  const [indexPattern, _setIndexPattern] = useState<IIndexPattern>({
    id: '',
    fields: [],
    title: '',
  });
  const setIndexPattern = (_indexPattern?: IIndexPattern) => {
    if (_indexPattern) {
      _setIndexPattern(_indexPattern);
      if (_indexPattern.title) {
        setAlertParams('index', _indexPattern.title);
      }
      if (_indexPattern.id) {
        setAlertParams('indexId', _indexPattern.id);
      }
    }
  };
  const [boundaryIndexPattern, _setBoundaryIndexPattern] = useState<IIndexPattern>({
    id: '',
    fields: [],
    title: '',
  });
  const setBoundaryIndexPattern = (_indexPattern?: IIndexPattern) => {
    if (_indexPattern) {
      _setBoundaryIndexPattern(_indexPattern);
      if (_indexPattern.title) {
        setAlertParams('boundaryIndexTitle', _indexPattern.title);
      }
      if (_indexPattern.id) {
        setAlertParams('boundaryIndexId', _indexPattern.id);
      }
    }
  };
  const [delayOffset, _setDelayOffset] = useState<number>(0);
  function setDelayOffset(_delayOffset: number) {
    setAlertParams('delayOffsetWithUnits', `${_delayOffset}${delayOffsetUnit}`);
    _setDelayOffset(_delayOffset);
  }
  const [delayOffsetUnit, setDelayOffsetUnit] = useState<string>('m');

  const hasExpressionErrors = false;
  const expressionErrorMessage = i18n.translate(
    'xpack.triggersActionsUI.geoThreshold.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  useEffect(() => {
    const initToDefaultParams = async () => {
      setAlertProperty('params', {
        ...alertParams,
        index: index ?? DEFAULT_VALUES.INDEX,
        indexId: indexId ?? DEFAULT_VALUES.INDEX_ID,
        entity: entity ?? DEFAULT_VALUES.ENTITY,
        dateField: dateField ?? DEFAULT_VALUES.DATE_FIELD,
        trackingEvent: trackingEvent ?? DEFAULT_VALUES.TRACKING_EVENT,
        boundaryType: boundaryType ?? DEFAULT_VALUES.BOUNDARY_TYPE,
        geoField: geoField ?? DEFAULT_VALUES.GEO_FIELD,
        boundaryIndexTitle: boundaryIndexTitle ?? DEFAULT_VALUES.BOUNDARY_INDEX,
        boundaryIndexId: boundaryIndexId ?? DEFAULT_VALUES.BOUNDARY_INDEX_ID,
        boundaryGeoField: boundaryGeoField ?? DEFAULT_VALUES.BOUNDARY_GEO_FIELD,
        boundaryNameField: boundaryNameField ?? DEFAULT_VALUES.BOUNDARY_NAME_FIELD,
        delayOffsetWithUnits: delayOffsetWithUnits ?? DEFAULT_VALUES.DELAY_OFFSET_WITH_UNITS,
      });
      if (!alertsContext.dataIndexPatterns) {
        return;
      }
      if (indexId) {
        const _indexPattern = await alertsContext.dataIndexPatterns.get(indexId);
        setIndexPattern(_indexPattern);
      }
      if (boundaryIndexId) {
        const _boundaryIndexPattern = await alertsContext.dataIndexPatterns.get(boundaryIndexId);
        setBoundaryIndexPattern(_boundaryIndexPattern);
      }
      if (delayOffsetWithUnits) {
        setDelayOffset(+delayOffsetWithUnits.replace(/\D/g, ''));
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
            id="xpack.triggersActionsUI.geoThreshold.selectOffset"
            defaultMessage="Select offset (optional)"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiFormRow fullWidth display="rowCompressed" label={labelForDelayOffset}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldNumber
                  fullWidth
                  min={0}
                  compressed
                  value={delayOffset || 0}
                  name="delayOffset"
                  onChange={(e) => {
                    setDelayOffset(+e.target.value);
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  fullWidth
                  compressed
                  value={delayOffsetUnit}
                  options={getTimeOptions(+alertInterval ?? 1)}
                  onChange={(e) => {
                    setDelayOffsetUnit(e.target.value);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.triggersActionsUI.geoThreshold.selectEntity"
            defaultMessage="Select entity"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EntityIndexExpression
        dateField={dateField}
        geoField={geoField}
        alertsContext={alertsContext}
        errors={errors}
        setAlertParamsDate={(_date) => setAlertParams('dateField', _date)}
        setAlertParamsGeoField={(_geoField) => setAlertParams('geoField', _geoField)}
        setAlertProperty={setAlertProperty}
        setIndexPattern={setIndexPattern}
        indexPattern={indexPattern}
        isInvalid={!indexId || !dateField || !geoField}
      />
      <EntityByExpression
        errors={errors}
        entity={entity}
        setAlertParamsEntity={(entityName) => setAlertParams('entity', entityName)}
        indexFields={indexPattern.fields}
        isInvalid={indexId && dateField && geoField ? !entity : false}
      />

      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.triggersActionsUI.geoThreshold.selectIndex"
            defaultMessage="Define the condition"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ExpressionWithPopover
        isInvalid={entity ? !trackingEvent : false}
        defaultValue={'Select crossing option'}
        value={trackingEvent}
        popoverContent={
          <EuiFormRow id="someSelect" fullWidth error={errors.index}>
            <div>
              <EuiSelect
                data-test-subj="whenExpressionSelect"
                value={
                  (trackingEvent && trackingEvent) ||
                  (entity &&
                    setAlertParams('trackingEvent', conditionOptions[0].text) &&
                    conditionOptions[0].text) ||
                  undefined
                }
                fullWidth
                onChange={(e) => setAlertParams('trackingEvent', e.target.value)}
                options={[conditionOptions[0]]} // TODO: Make all options avab. before merge
              />
            </div>
          </EuiFormRow>
        }
        expressionDescription={i18n.translate(
          'xpack.triggersActionsUI.geoThreshold.whenEntityLabel',
          {
            defaultMessage: 'when entity',
          }
        )}
      />

      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.triggersActionsUI.geoThreshold.selectBoundaryIndex"
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
        setBoundaryGeoField={(_geoField: string | undefined) =>
          _geoField && setAlertParams('boundaryGeoField', _geoField)
        }
        setBoundaryNameField={(_boundaryNameField: string | undefined) =>
          _boundaryNameField
            ? setAlertParams('boundaryNameField', _boundaryNameField)
            : setAlertParams('boundaryNameField', '')
        }
        boundaryNameField={boundaryNameField}
      />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { GeoThresholdAlertTypeExpression as default };
