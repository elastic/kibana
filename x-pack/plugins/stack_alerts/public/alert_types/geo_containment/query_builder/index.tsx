/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { EuiCallOut, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AlertTypeParamsExpressionProps } from '../../../../../triggers_actions_ui/public';
import { GeoContainmentAlertParams } from '../types';
import { EntityIndexExpression } from './expressions/entity_index_expression';
import { EntityByExpression } from './expressions/entity_by_expression';
import { BoundaryIndexExpression } from './expressions/boundary_index_expression';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common';
import {
  esQuery,
  esKuery,
  Query,
  QueryStringInput,
} from '../../../../../../../src/plugins/data/public';

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

function validateQuery(query: Query) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    query.language === 'kuery'
      ? esKuery.fromKueryExpression(query.query)
      : esQuery.luceneStringToDsl(query.query);
  } catch (err) {
    return false;
  }
  return true;
}

export const GeoContainmentAlertTypeExpression: React.FunctionComponent<
  AlertTypeParamsExpressionProps<GeoContainmentAlertParams>
> = ({ alertParams, alertInterval, setAlertParams, setAlertProperty, errors, data }) => {
  const {
    index,
    indexId,
    indexQuery,
    geoField,
    entity,
    dateField,
    boundaryType,
    boundaryIndexTitle,
    boundaryIndexId,
    boundaryIndexQuery,
    boundaryGeoField,
    boundaryNameField,
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
  const [indexQueryInput, setIndexQueryInput] = useState<Query>(
    indexQuery || {
      query: '',
      language: 'kuery',
    }
  );
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
  const [boundaryIndexQueryInput, setBoundaryIndexQueryInput] = useState<Query>(
    boundaryIndexQuery || {
      query: '',
      language: 'kuery',
    }
  );

  const hasExpressionErrors = false;
  const expressionErrorMessage = i18n.translate(
    'xpack.stackAlerts.geoContainment.fixErrorInExpressionBelowValidationMessage',
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
        boundaryType: boundaryType ?? DEFAULT_VALUES.BOUNDARY_TYPE,
        geoField: geoField ?? DEFAULT_VALUES.GEO_FIELD,
        boundaryIndexTitle: boundaryIndexTitle ?? DEFAULT_VALUES.BOUNDARY_INDEX,
        boundaryIndexId: boundaryIndexId ?? DEFAULT_VALUES.BOUNDARY_INDEX_ID,
        boundaryGeoField: boundaryGeoField ?? DEFAULT_VALUES.BOUNDARY_GEO_FIELD,
        boundaryNameField: boundaryNameField ?? DEFAULT_VALUES.BOUNDARY_NAME_FIELD,
      });
      if (!data.indexPatterns) {
        return;
      }
      if (indexId) {
        const _indexPattern = await data.indexPatterns.get(indexId);
        setIndexPattern(_indexPattern);
      }
      if (boundaryIndexId) {
        const _boundaryIndexPattern = await data.indexPatterns.get(boundaryIndexId);
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
            id="xpack.stackAlerts.geoContainment.selectEntity"
            defaultMessage="Select entity"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EntityIndexExpression
        dateField={dateField}
        geoField={geoField}
        errors={errors}
        setAlertParamsDate={(_date) => setAlertParams('dateField', _date)}
        setAlertParamsGeoField={(_geoField) => setAlertParams('geoField', _geoField)}
        setAlertProperty={setAlertProperty}
        setIndexPattern={setIndexPattern}
        indexPattern={indexPattern}
        isInvalid={!indexId || !dateField || !geoField}
        data={data}
      />
      <EntityByExpression
        errors={errors}
        entity={entity}
        setAlertParamsEntity={(entityName) => setAlertParams('entity', entityName)}
        indexFields={indexPattern.fields}
        isInvalid={indexId && dateField && geoField ? !entity : false}
      />
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <QueryStringInput
          disableAutoFocus
          bubbleSubmitEvent
          indexPatterns={indexPattern ? [indexPattern] : []}
          query={indexQueryInput}
          onChange={(query) => {
            if (query.language) {
              if (validateQuery(query)) {
                setAlertParams('indexQuery', query);
              }
              setIndexQueryInput(query);
            }
          }}
        />
      </EuiFlexItem>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.geoContainment.selectBoundaryIndex"
            defaultMessage="Select boundary"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <BoundaryIndexExpression
        alertParams={alertParams}
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
        data={data}
      />
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <QueryStringInput
          disableAutoFocus
          bubbleSubmitEvent
          indexPatterns={boundaryIndexPattern ? [boundaryIndexPattern] : []}
          query={boundaryIndexQueryInput}
          onChange={(query) => {
            if (query.language) {
              if (validateQuery(query)) {
                setAlertParams('boundaryIndexQuery', query);
              }
              setBoundaryIndexQueryInput(query);
            }
          }}
        />
      </EuiFlexItem>
      <EuiSpacer size="l" />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { GeoContainmentAlertTypeExpression as default };
