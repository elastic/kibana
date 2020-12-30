/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'tinymath';
import { getFieldType } from '../../../../../common/lib/get_field_type';
import { isColumnReference } from './is_column_reference';
import { getFieldNames } from './get_field_names';

export function getExpressionType(columns, mathExpression) {
  // if isColumnReference returns true, then mathExpression is just a string
  // referencing a column in a datatable
  if (isColumnReference(mathExpression)) {
    return getFieldType(columns, mathExpression);
  }

  const parsedMath = parse(mathExpression);

  if (parsedMath.args) {
    const fieldNames = parsedMath.args.reduce(getFieldNames, []);

    if (fieldNames.length > 0) {
      const fieldTypes = fieldNames.reduce((types, name) => {
        const type = getFieldType(columns, name);
        if (type !== 'null' && types.indexOf(type) === -1) {
          return types.concat(type);
        }

        return types;
      }, []);

      return fieldTypes.length === 1 ? fieldTypes[0] : 'string';
    }
    return 'number';
  }

  return typeof parsedMath;
}
