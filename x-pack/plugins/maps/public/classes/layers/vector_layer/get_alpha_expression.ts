/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MASK_OPERATOR, MB_LOOKUP_FUNCTION } from '../../../../common/constants';

function getConditionExpression({
  lookupFunction,
  mbFieldName,
  operator,
  value,
}: {
  lookupFunction: MB_LOOKUP_FUNCTION;
  mbFieldName: string;
  operator: MASK_OPERATOR;
  value: number;
}) {
  const comparisionOperator = operator === MASK_OPERATOR.BELOW ? '<' : '>';
  const value1 = [lookupFunction, mbFieldName];
  const value2 = value;
  return [comparisionOperator, [lookupFunction, mbFieldName], value];
}

export function getAlphaExpression(alpha: number, source: IVectorSource, joins: InnerJoin[]) {
  const maskCases = [];
  if ('getMetricFields' in (source as IESAggSource)) {
    const metricFields = (source as IESAggSource).getMetricFields();
    metricFields.forEach((metricField) => {
      const mask = metricField.getMask();
      if (mask) {
        // condition expression
        maskCases.push(
          getConditionExpression({
            lookupFunction: MB_LOOKUP_FUNCTION.GET,
            mbFieldName: metricField.getMbFieldName(),
            ...mask,
          })
        );
        // output: 0 opacity styling "hides" feature
        maskCases.push(0);
      }
    });
  }

  joins.forEach((join) => {
    const rightSource = join.getRightJoinSource();
    if ('getMetricFields' in (rightSource as IESAggSource)) {
      const metricFields = (rightSource as IESAggSource).getMetricFields();
      metricFields.forEach((metricField) => {
        const mask = metricField.getMask();
        if (mask) {
          // condition expression
          maskCases.push(
            getConditionExpression({
              lookupFunction: MB_LOOKUP_FUNCTION.FEATURE_STATE,
              mbFieldName: metricField.getMbFieldName(),
              ...mask,
            })
          );
          // output: 0 opacity styling "hides" feature
          maskCases.push(0);
        }
      });
    }
  });

  return maskCases.length ? ['case', ...maskCases, alpha] : alpha;
}
