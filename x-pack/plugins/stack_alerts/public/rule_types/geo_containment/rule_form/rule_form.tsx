/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { Query } from '@kbn/es-query';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { GeoContainmentAlertParams } from '../types';
import { BoundaryForm } from './boundary_form';
import { EntityForm } from './entity_form';

export const RuleForm: React.FunctionComponent<
  RuleTypeParamsExpressionProps<GeoContainmentAlertParams>
> = (props) => {
  function getValidationError(key: string) {
    return props.errors[key]?.length > 0 && key in props.ruleParams
      ? (props.errors[key] as string[])[0]
      : null;
  }

  return (
    <>
      <EntityForm
        data={props.data}
        getValidationError={getValidationError}
        ruleParams={props.ruleParams}
        setDataViewId={(id: string) => props.setRuleParams('indexId', id)}
        setDataViewTitle={(title: string) => props.setRuleParams('index', title)}
        setDateField={(fieldName: string) => props.setRuleParams('dateField', fieldName)}
        setEntityField={(fieldName: string) => props.setRuleParams('entity', fieldName)}
        setGeoField={(fieldName: string) => props.setRuleParams('geoField', fieldName)}
        setQuery={(query: Query) => props.setRuleParams('indexQuery', query)}
        unifiedSearch={props.unifiedSearch}
      />

      <EuiSpacer size="s" />

      <BoundaryForm
        data={props.data}
        getValidationError={getValidationError}
        ruleParams={props.ruleParams}
        setDataViewId={(id: string) => {
          props.setRuleParams('boundaryIndexId', id);
          // TODO remove unused param 'boundaryType'
          props.setRuleParams('boundaryType', 'entireIndex');
        }}
        setDataViewTitle={(title: string) => props.setRuleParams('boundaryIndexTitle', title)}
        setGeoField={(fieldName: string) => props.setRuleParams('boundaryGeoField', fieldName)}
        setNameField={(fieldName: string | undefined) =>
          props.setRuleParams('boundaryNameField', fieldName)
        }
        setQuery={(query: Query) => props.setRuleParams('boundaryIndexQuery', query)}
        unifiedSearch={props.unifiedSearch}
      />

      <EuiSpacer size="l" />
    </>
  );
};
