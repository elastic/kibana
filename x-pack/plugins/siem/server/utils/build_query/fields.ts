/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldNode, SelectionNode, SelectionSetNode } from 'graphql';
import { isEmpty } from 'lodash/fp';

export const getFields = (
  data: SelectionSetNode | FieldNode,
  fields: string[] = [],
  postFields: string[] = []
): string[] => {
  if (data.kind === 'Field' && data.selectionSet && !isEmpty(data.selectionSet.selections)) {
    return getFields(data.selectionSet, fields);
  } else if (data.kind === 'SelectionSet') {
    return data.selections.reduce(
      (res: string[], item: SelectionNode) => {
        if (item.kind === 'Field') {
          const field: FieldNode = item as FieldNode;
          if (field.name.kind === 'Name' && field.name.value.includes('kpi')) {
            return [...res, field.name.value];
          } else if (field.selectionSet && !isEmpty(field.selectionSet.selections)) {
            return getFields(field.selectionSet, res, postFields.concat(field.name.value));
          }
          return [...res, [...postFields, field.name.value].join('.')];
        }
        return res;
      },
      fields as string[]
    );
  }

  return fields;
};
