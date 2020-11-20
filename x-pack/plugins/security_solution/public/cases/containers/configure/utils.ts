/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Connector Mappings
import { flow } from 'lodash';
import {
  EntityInformation,
  PipedField,
  PrepareFieldsForTransformArgs,
  Transformer,
  TransformerArgs,
  TransformFieldsArgs,
} from './types';
import * as i18n from './translations';

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

export const prepareFieldsForTransformation = ({
  externalCase,
  mappings,
  defaultPipes = ['informationCreated'],
}: PrepareFieldsForTransformArgs): PipedField[] => {
  return Object.keys(externalCase)
    .filter((p) => mappings.get(p)?.actionType != null && mappings.get(p)?.actionType !== 'nothing')
    .map((p) => {
      const actionType = mappings.get(p)?.actionType ?? 'nothing';
      return {
        key: p,
        value: externalCase[p],
        actionType,
        pipes: actionType === 'append' ? [...defaultPipes, 'append'] : defaultPipes,
      };
    });
};

export const transformers: Record<string, Transformer> = {
  informationCreated: ({ value, date, user, ...rest }: TransformerArgs): TransformerArgs => ({
    value: `${value} ${i18n.FIELD_INFORMATION('create', date, user)}`,
    ...rest,
  }),
  informationUpdated: ({ value, date, user, ...rest }: TransformerArgs): TransformerArgs => ({
    value: `${value} ${i18n.FIELD_INFORMATION('update', date, user)}`,
    ...rest,
  }),
  informationAdded: ({ value, date, user, ...rest }: TransformerArgs): TransformerArgs => ({
    value: `${value} ${i18n.FIELD_INFORMATION('add', date, user)}`,
    ...rest,
  }),
  append: ({ value, previousValue, ...rest }: TransformerArgs): TransformerArgs => ({
    value: previousValue ? `${previousValue} \r\n${value}` : `${value}`,
    ...rest,
  }),
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
