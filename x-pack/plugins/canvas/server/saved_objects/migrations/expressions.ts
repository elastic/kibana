/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Ast, fromExpression, toExpression } from '@kbn/interpreter/common';
import { Serializable } from '@kbn/utility-types';
import { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from 'kibana/server';
import { flowRight, mapValues } from 'lodash';
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

type ExprAst = ToSerializable<Ast>;

const toAst = (expression: string): ExprAst => fromExpression(expression);
const fromAst = (ast: Ast): string => toExpression(ast);

const migrateExpr = (expr: string, migrateFn: MigrateFunction<ExprAst, ExprAst>) =>
  flowRight<string[], ExprAst, ExprAst, string>(fromAst, migrateFn, toAst)(expr);

const migrateExpressionsAndFilters =
  (
    migrate: MigrateFunction<ExprAst, ExprAst>,
    version: string
  ): SavedObjectMigrationFn<WorkpadAttributes> =>
  (doc: SavedObjectUnsanitizedDoc<WorkpadAttributes>) => {
    if (typeof doc.attributes !== 'object' || doc.attributes === null) {
      return doc;
    }
    const { pages } = doc.attributes;

    const newPages = pages.map((page) => {
      const { elements } = page;
      const newElements = elements.map(({ filter, expression, ...element }) => ({
        ...element,
        filter: filter ? migrateExpr(filter, migrate) : filter,
        expression: expression ? migrateExpr(expression, migrate) : expression,
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
