/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flow, get } from 'lodash';

import {
  MapRecord,
  TransformFieldsArgs,
  Comment,
  EntityInformation,
  PipedField,
  AnyParams,
  PrepareFieldsForTransformArgs,
} from './types';

import { transformers } from './transformers';

import { SUPPORTED_SOURCE_FIELDS } from './constants';

export const normalizeMapping = (supportedFields: string[], mapping: MapRecord[]): MapRecord[] => {
  // Prevent prototype pollution and remove unsupported fields
  return mapping.filter(
    (m) =>
      m.source !== '__proto__' && m.target !== '__proto__' && supportedFields.includes(m.source)
  );
};

export const buildMap = (mapping: MapRecord[]): Map<string, MapRecord> => {
  return normalizeMapping(SUPPORTED_SOURCE_FIELDS, mapping).reduce((fieldsMap, field) => {
    const { source, target, actionType } = field;
    fieldsMap.set(source, { target, actionType });
    fieldsMap.set(target, { target: source, actionType });
    return fieldsMap;
  }, new Map());
};

export const mapParams = <T extends {}>(params: T, mapping: Map<string, MapRecord>): AnyParams => {
  return Object.keys(params).reduce((prev: AnyParams, curr: string): AnyParams => {
    const field = mapping.get(curr);
    if (field) {
      prev[field.target] = get(params, curr);
    }
    return prev;
  }, {});
};

export const prepareFieldsForTransformation = ({
  externalCase,
  mapping,
  defaultPipes = ['informationCreated'],
}: PrepareFieldsForTransformArgs): PipedField[] => {
  return Object.keys(externalCase)
    .filter((p) => mapping.get(p)?.actionType != null && mapping.get(p)?.actionType !== 'nothing')
    .map((p) => {
      const actionType = mapping.get(p)?.actionType ?? 'nothing';
      return {
        key: p,
        value: externalCase[p],
        actionType,
        pipes: actionType === 'append' ? [...defaultPipes, 'append'] : defaultPipes,
      };
    });
};

export const transformFields = <
  P extends EntityInformation,
  S extends Record<string, unknown>,
  R extends {}
>({
  params,
  fields,
  currentIncident,
}: TransformFieldsArgs<P, S>): R => {
  return fields.reduce((prev, cur) => {
    const transform = flow(...cur.pipes.map((p) => transformers[p]));
    return {
      ...prev,
      [cur.key]: transform({
        value: cur.value,
        date: params.updatedAt ?? params.createdAt,
        user: getEntity(params),
        previousValue: currentIncident ? currentIncident[cur.key] : '',
      }).value,
    };
  }, {} as R);
};

export const transformComments = (comments: Comment[], pipes: string[]): Comment[] => {
  return comments.map((c) => ({
    ...c,
    comment: flow(...pipes.map((p) => transformers[p]))({
      value: c.comment,
      date: c.updatedAt ?? c.createdAt,
      user: getEntity(c),
    }).value,
  }));
};

export const getEntity = (entity: EntityInformation): string =>
  (entity.updatedBy != null
    ? entity.updatedBy.fullName
      ? entity.updatedBy.fullName
      : entity.updatedBy.username
    : entity.createdBy != null
    ? entity.createdBy.fullName
      ? entity.createdBy.fullName
      : entity.createdBy.username
    : '') ?? '';
