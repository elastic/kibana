/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Ast, fromExpression, toExpression } from '@kbn/interpreter';
import { Serializable } from '@kbn/utility-types';
import { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from 'kibana/server';
import { flowRight, mapValues } from 'lodash';
import {
  CanvasElement,
  CanvasTemplateElement,
  CanvasTemplate,
  CustomElement,
  CustomElementContent,
  CustomElementNode,
} from '../../../types';
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

interface CommonPage<T> {
  elements?: T[];
}
interface CommonWorkpad<T extends CommonPage<U>, U> {
  pages?: T[];
}

type MigrationFn<T> = (
  migrate: MigrateFunction<ExprAst, ExprAst>,
  version: string
) => SavedObjectMigrationFn<T>;

const toAst = (expression: string): ExprAst => fromExpression(expression);
const fromAst = (ast: Ast): string => toExpression(ast);

const migrateExpr = (expr: string, migrateFn: MigrateFunction<ExprAst, ExprAst>) =>
  flowRight<string[], ExprAst, ExprAst, string>(fromAst, migrateFn, toAst)(expr);

const migrateWorkpadElement =
  (migrate: MigrateFunction<ExprAst, ExprAst>) =>
  ({ filter, expression, ...element }: CanvasElement | CustomElementNode) => ({
    ...element,
    filter: filter ? migrateExpr(filter, migrate) : filter,
    expression: expression ? migrateExpr(expression, migrate) : expression,
  });

const migrateTemplateElement =
  (migrate: MigrateFunction<ExprAst, ExprAst>) =>
  ({ expression, ...element }: CanvasTemplateElement) => ({
    ...element,
    expression: expression ? migrateExpr(expression, migrate) : expression,
  });

const migrateWorkpadElements = <T extends CommonPage<U>, U>(
  doc: SavedObjectUnsanitizedDoc<CommonWorkpad<T, U> | undefined>,
  migrateElementFn: any
) => {
  if (
    typeof doc.attributes !== 'object' ||
    doc.attributes === null ||
    doc.attributes === undefined
  ) {
    return doc;
  }

  const { pages } = doc.attributes;

  const newPages = pages?.map((page) => {
    const { elements } = page;
    const newElements = elements?.map(migrateElementFn);
    return { ...page, elements: newElements };
  });

  return { ...doc, attributes: { ...doc.attributes, pages: newPages } };
};

const migrateTemplateWorkpadExpressions: MigrationFn<CanvasTemplate['template']> =
  (migrate) => (doc) =>
    migrateWorkpadElements(doc, migrateTemplateElement(migrate));

const migrateWorkpadExpressionsAndFilters: MigrationFn<WorkpadAttributes> = (migrate) => (doc) =>
  migrateWorkpadElements(doc, migrateWorkpadElement(migrate));

const migrateCustomElementExpressionsAndFilters: MigrationFn<CustomElement> =
  (migrate) => (doc) => {
    if (
      typeof doc.attributes !== 'object' ||
      doc.attributes === null ||
      doc.attributes === undefined
    ) {
      return doc;
    }

    const { content } = doc.attributes;
    const { selectedNodes = [] }: CustomElementContent = content
      ? JSON.parse(content)
      : { selectedNodes: [] };

    const newSelectedNodes = selectedNodes.map((element) => {
      const newElement = migrateWorkpadElement(migrate)(element);
      return { ...element, ...newElement, ast: toAst(newElement.expression) };
    });

    const newContent = JSON.stringify({ selectedNodes: newSelectedNodes });
    return { ...doc, attributes: { ...doc.attributes, content: newContent } };
  };

export const workpadExpressionsMigrationsFactory = ({
  expressions,
}: CanvasSavedObjectTypeMigrationsDeps) =>
  mapValues<MigrateFunctionsObject, SavedObjectMigrationFn<WorkpadAttributes>>(
    expressions.getAllMigrations(),
    migrateWorkpadExpressionsAndFilters
  ) as MigrateFunctionsObject;

export const templateWorkpadExpressionsMigrationsFactory = ({
  expressions,
}: CanvasSavedObjectTypeMigrationsDeps) =>
  mapValues<MigrateFunctionsObject, SavedObjectMigrationFn<CanvasTemplate['template']>>(
    expressions.getAllMigrations(),
    migrateTemplateWorkpadExpressions
  ) as MigrateFunctionsObject;

export const customElementExpressionsMigrationsFactory = ({
  expressions,
}: CanvasSavedObjectTypeMigrationsDeps) =>
  mapValues<MigrateFunctionsObject, SavedObjectMigrationFn<CustomElement>>(
    expressions.getAllMigrations(),
    migrateCustomElementExpressionsAndFilters
  ) as MigrateFunctionsObject;
