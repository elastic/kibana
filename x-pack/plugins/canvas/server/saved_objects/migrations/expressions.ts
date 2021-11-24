/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Ast, fromExpression } from '@kbn/interpreter/common';
import { Serializable } from '@kbn/utility-types';
import { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from 'kibana/server';
import { mapValues } from 'lodash';
import {
  MigrateFunction,
  MigrateFunctionsObject,
} from '../../../../../../src/plugins/kibana_utils/common';
import { WorkpadAttributes } from '../../routes/workpad/workpad_attributes';
import { CanvasSavedObjectTypeMigrationsDeps } from './types';

type ToSerializable<Type> = {
  [K in keyof Type]: Type[K] extends unknown[]
    ? ToSerializable<Type[K]>
    : Type[K] extends {}
    ? ToSerializable<Type[K]>
    : Serializable;
};

const getAst = (expression: string): ToSerializable<Ast> => fromExpression(expression);

const migrateExpressionsAndFilters =
  (migrate: MigrateFunction, version: string): SavedObjectMigrationFn<WorkpadAttributes> =>
  (doc: SavedObjectUnsanitizedDoc<WorkpadAttributes>) => {
    if (typeof doc.attributes !== 'object' || doc.attributes === null) {
      return doc;
    }
    const { pages } = doc.attributes;

    const newPages = pages.map((page) => {
      const { elements } = page;
      const newElements = elements.map(({ filter, expression, ...element }) => ({
        ...element,
        filter: filter ? migrate(getAst(filter)) : filter,
        expression: expression ? migrate(getAst(expression)) : expression,
      }));
      return { ...page, elements: newElements };
    });

    return { ...doc, attributes: { ...doc.attributes, pages: newPages } };
  };

export const expressionsMigrationsFactory = ({
  expressions,
}: CanvasSavedObjectTypeMigrationsDeps) =>
  mapValues<MigrateFunctionsObject, SavedObjectMigrationFn<WorkpadAttributes>>(
    expressions.getAllMigrations(),
    migrateExpressionsAndFilters
  ) as MigrateFunctionsObject;
