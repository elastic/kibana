/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SUPPORTED_SOURCE_FIELDS } from './constants';
import {
  MapsType,
  FinalMapping,
  AppendFieldArgs,
  ApplyActionTypeToFieldsArgs,
  AppendInformationFieldArgs,
  HandlerParamsType,
  CommentType,
} from './types';
import { Incident } from './lib/types';

export const normalizeMapping = (fields: string[], mapping: MapsType[]): MapsType[] => {
  // Prevent prototype pollution and remove unsupported fields
  return mapping.filter(
    m => m.source !== '__proto__' && m.target !== '__proto__' && fields.includes(m.source)
  );
};

export const buildMap = (mapping: MapsType[]): FinalMapping => {
  return normalizeMapping(SUPPORTED_SOURCE_FIELDS, mapping).reduce((fieldsMap, field) => {
    const { source, target, actionType } = field;
    fieldsMap.set(source, { target, actionType });
    fieldsMap.set(target, { target: source, actionType });
    return fieldsMap;
  }, new Map());
};

interface KeyAny {
  [key: string]: unknown;
}

export const mapParams = (params: any, mapping: FinalMapping) => {
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

export const applyActionTypeToFields = ({
  params,
  mapping,
  incident,
}: ApplyActionTypeToFieldsArgs): Incident => {
  // Ignore fields that have as actionType = nothing
  const filterMappedParams = Object.keys(params.mappedParams)
    .filter((p: string) => mapping.get(p).actionType !== 'nothing')
    .reduce((fields: KeyAny, paramKey: string) => {
      fields[paramKey] = params.mappedParams[paramKey];
      return fields;
    }, {} as KeyAny);

  // Append previous incident's value to fields that have as actionType = append
  // otherwise overwrite

  const paramsWithInformation = appendInformationToIncident(
    { ...params, mappedParams: filterMappedParams },
    'update'
  );

  return Object.keys(paramsWithInformation).reduce((fields: Incident, paramKey: string) => {
    const actionType = mapping.get(paramKey).actionType;
    const incidentCurrentFieldValue = incident[paramKey] ?? '';

    if (actionType === 'append') {
      fields[paramKey] = appendField({
        value: paramsWithInformation[paramKey] as string,
        suffix: incidentCurrentFieldValue,
      });
    } else {
      fields[paramKey] = paramsWithInformation[paramKey] as string;
    }

    return fields;
  }, {} as Incident);
};

export const appendInformationToField = ({
  value,
  user,
  date,
  mode = 'create',
}: AppendInformationFieldArgs): string => {
  const action = mode === 'create' ? 'created at' : 'updated at';
  return appendField({
    value,
    suffix: `(${action} ${date} by ${user})`,
  });
};

export const appendInformationToIncident = (params: HandlerParamsType, mode: string): Incident => {
  return Object.keys(params.mappedParams).reduce((fields: Incident, paramKey: string) => {
    fields[paramKey] = appendInformationToField({
      value: params.mappedParams[paramKey],
      user: params.createdBy.fullName ?? '',
      date: params.createdAt,
      mode,
    });
    return fields;
  }, {} as Incident);
};

export const appendInformationToComments = (
  comments: CommentType[],
  params: HandlerParamsType,
  mode: string
): CommentType[] => {
  return comments.map(c => ({
    ...c,
    comment: appendInformationToField({
      value: c.comment,
      user: params.createdBy.fullName ?? '',
      date: params.createdAt,
      mode,
    }),
  }));
};
