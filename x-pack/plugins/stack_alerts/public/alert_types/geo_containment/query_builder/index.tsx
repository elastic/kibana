/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { EuiCallOut, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression, luceneStringToDsl } from '@kbn/es-query';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { DataView } from '@kbn/data-plugin/common';
import { Query } from '@kbn/data-plugin/public';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';
import { GeoContainmentAlertParams } from '../types';
import { EntityIndexExpression } from './expressions/entity_index_expression';
import { EntityByExpression } from './expressions/entity_by_expression';
import { BoundaryIndexExpression } from './expressions/boundary_index_expression';

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
    query.language === 'kuery' ? fromKueryExpression(query.query) : luceneStringToDsl(query.query);
  } catch (err) {
    return false;
  }
  return true;
}

export const GeoContainmentAlertTypeExpression: React.FunctionComponent<
  RuleTypeParamsExpressionProps<GeoContainmentAlertParams>
> = ({ ruleParams, ruleInterval, setRuleParams, setRuleProperty, errors, data, unifiedSearch }) => {
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
  } = ruleParams;

  const [indexPattern, _setIndexPattern] = useState<DataView>({
    id: '',
    title: '',
  } as DataView);
  const setIndexPattern = (_indexPattern?: DataView) => {
    if (_indexPattern) {
      _setIndexPattern(_indexPattern);
      if (_indexPattern.title) {
        setRuleParams('index', _indexPattern.title);
      }
      if (_indexPattern.id) {
        setRuleParams('indexId', _indexPattern.id);
      }
    }
  };
  const [indexQueryInput, setIndexQueryInput] = useState<Query>(
    indexQuery || {
      query: '',
      language: 'kuery',
    }
  );
  const [boundaryIndexPattern, _setBoundaryIndexPattern] = useState<DataView>({
    id: '',
    title: '',
  } as DataView);
  const setBoundaryIndexPattern = (_indexPattern?: DataView) => {
    if (_indexPattern) {
      _setBoundaryIndexPattern(_indexPattern);
      if (_indexPattern.title) {
        setRuleParams('boundaryIndexTitle', _indexPattern.title);
      }
      if (_indexPattern.id) {
        setRuleParams('boundaryIndexId', _indexPattern.id);
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
      setRuleProperty('params', {
        ...ruleParams,
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
        setAlertParamsDate={(_date) => setRuleParams('dateField', _date)}
        setAlertParamsGeoField={(_geoField) => setRuleParams('geoField', _geoField)}
        setRuleProperty={setRuleProperty}
        setIndexPattern={setIndexPattern}
        indexPattern={indexPattern}
        isInvalid={!indexId || !dateField || !geoField}
        data={data}
        unifiedSearch={unifiedSearch}
      />
      <EntityByExpression
        errors={errors}
        entity={entity}
        setAlertParamsEntity={(entityName) => setRuleParams('entity', entityName)}
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
                setRuleParams('indexQuery', query);
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
        ruleParams={ruleParams}
        errors={errors}
        boundaryIndexPattern={boundaryIndexPattern}
        setBoundaryIndexPattern={setBoundaryIndexPattern}
        setBoundaryGeoField={(_geoField: string | undefined) =>
          _geoField && setRuleParams('boundaryGeoField', _geoField)
        }
        setBoundaryNameField={(_boundaryNameField: string | undefined) =>
          _boundaryNameField
            ? setRuleParams('boundaryNameField', _boundaryNameField)
            : setRuleParams('boundaryNameField', '')
        }
        boundaryNameField={boundaryNameField}
        data={data}
        unifiedSearch={unifiedSearch}
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
                setRuleParams('boundaryIndexQuery', query);
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
