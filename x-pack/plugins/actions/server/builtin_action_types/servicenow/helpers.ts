/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flow } from 'lodash';

import { SUPPORTED_SOURCE_FIELDS } from './constants';
import {
  MapEntry,
  Mapping,
  AppendFieldArgs,
  AppendInformationFieldArgs,
  Params,
  Comment,
  TransformFieldsArgs,
  PipedField,
  PrepareFieldsForTransformArgs,
  KeyAny,
} from './types';
import { Incident } from './lib/types';

import * as transformers from './transformers';
import * as i18n from './translations';

export const normalizeMapping = (supportedFields: string[], mapping: MapEntry[]): MapEntry[] => {
  // Prevent prototype pollution and remove unsupported fields
  return mapping.filter(
    (m) =>
      m.source !== '__proto__' && m.target !== '__proto__' && supportedFields.includes(m.source)
  );
};

export const buildMap = (mapping: MapEntry[]): Mapping => {
  return normalizeMapping(SUPPORTED_SOURCE_FIELDS, mapping).reduce((fieldsMap, field) => {
    const { source, target, actionType } = field;
    fieldsMap.set(source, { target, actionType });
    fieldsMap.set(target, { target: source, actionType });
    return fieldsMap;
  }, new Map());
};

export const mapParams = (params: any, mapping: Mapping) => {
  return Object.keys(params).reduce((prev: KeyAny, curr: string): KeyAny => {
    const field = mapping.get(curr);
    if (field) {
      prev[field.target] = params[curr];
    }
    return prev;
  }, {});
};

export const appendField = ({ value, prefix = '', suffix = '' }: AppendFieldArgs): string => {
  return `${prefix}${value} ${suffix}`;
};

const t = { ...transformers } as { [index: string]: Function }; // TODO: Find a better solution exists.

export const prepareFieldsForTransformation = ({
  params,
  mapping,
  defaultPipes = ['informationCreated'],
}: PrepareFieldsForTransformArgs): PipedField[] => {
  return Object.keys(params.incident)
    .filter((p) => mapping.get(p).actionType !== 'nothing')
    .map((p) => ({
      key: p,
      value: params.incident[p],
      actionType: mapping.get(p).actionType,
      pipes: [...defaultPipes],
    }))
    .map((p) => ({
      ...p,
      pipes: p.actionType === 'append' ? [...p.pipes, 'append'] : p.pipes,
    }));
};

export const transformFields = ({
  params,
  fields,
  currentIncident,
}: TransformFieldsArgs): Incident => {
  return fields.reduce((prev: Incident, cur) => {
    const transform = flow(...cur.pipes.map((p) => t[p]));
    prev[cur.key] = transform({
      value: cur.value,
      date: params.updatedAt ?? params.createdAt,
      user:
        params.updatedBy != null
          ? params.updatedBy.fullName ?? params.updatedBy.username
          : params.createdBy.fullName ?? params.createdBy.username,
      previousValue: currentIncident ? currentIncident[cur.key] : '',
    }).value;
    return prev;
  }, {} as Incident);
};

export const appendInformationToField = ({
  value,
  user,
  date,
  mode = 'create',
}: AppendInformationFieldArgs): string => {
  return appendField({
    value,
    suffix: i18n.FIELD_INFORMATION(mode, date, user),
  });
};

export const transformComments = (
  comments: Comment[],
  params: Params,
  pipes: string[]
): Comment[] => {
  return comments.map((c) => ({
    ...c,
    comment: flow(...pipes.map((p) => t[p]))({
      value: c.comment,
      date: c.updatedAt ?? c.createdAt,
      user:
        c.updatedBy != null
          ? c.updatedBy.fullName ?? c.updatedBy.username
          : c.createdBy.fullName ?? c.createdBy.username,
    }).value,
  }));
};
