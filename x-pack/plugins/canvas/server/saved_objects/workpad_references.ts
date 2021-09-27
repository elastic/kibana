/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression, toExpression } from '@kbn/interpreter/common';
import { PersistableStateService } from '../../../../../src/plugins/kibana_utils/common';
import { SavedObjectReference } from '../../../../../src/core/server';
import { WorkpadAttributes } from '../routes/workpad/workpad_attributes';

import type { ExpressionAstExpression } from '../../../../../src/plugins/expressions';

export const extractReferences = (
  workpad: WorkpadAttributes,
  expressions: PersistableStateService<ExpressionAstExpression>
): { workpad: WorkpadAttributes; references: SavedObjectReference[] } => {
  // We need to find every element in the workpad and extract references
  const references: SavedObjectReference[] = [];

  const pages = workpad.pages.map((page) => {
    const elements = page.elements.map((element) => {
      const extract = expressions.extract(fromExpression(element.expression));

      // Prefix references with the element id so we will know later which element it goes with
      references.push(
        ...extract.references.map((reference) => ({
          ...reference,
          name: `${element.id}:${reference.name}`,
        }))
      );

      return { ...element, expression: toExpression(extract.state) };
    });

    return { ...page, elements };
  });

  return { workpad: { ...workpad, pages }, references };
};

export const injectReferences = (
  workpad: WorkpadAttributes,
  references: SavedObjectReference[],
  expressions: PersistableStateService<ExpressionAstExpression>
) => {
  const pages = workpad.pages.map((page) => {
    const elements = page.elements.map((element) => {
      const referencesForElement = references
        .filter(({ name }) => name.indexOf(element.id) === 0)
        .map((reference) => ({
          ...reference,
          name: reference.name.replace(`${element.id}:`, ''),
        }));

      const injectedAst = expressions.inject(
        fromExpression(element.expression),
        referencesForElement
      );

      return { ...element, expression: toExpression(injectedAst) };
    });

    return { ...page, elements };
  });

  return { ...workpad, pages };
};
