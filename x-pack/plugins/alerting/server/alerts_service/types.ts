/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { getComponentTemplateFromFieldMap } from '../../common/alert_schema';
import { FieldMap } from '../../common/alert_schema/field_maps/types';

export const getComponentTemplateName = (context?: string) =>
  `alerts-${context ? context : 'default'}-component-template`;

export interface IIndexPatternString {
  template: string;
  pattern: string;
  alias: string;
  name: string;
}

export const getIndexTemplateAndPattern = (context?: string): IIndexPatternString => {
  const pattern = context ? context : 'default';
  return {
    template: `.alerts-${pattern}-template`,
    pattern: `.alerts-${pattern}-*`,
    alias: `.alerts-${pattern}`,
    name: `.alerts-${pattern}-000001`,
  };
};

export const getComponentTemplate = (
  fieldMap: FieldMap,
  context?: string
): ClusterPutComponentTemplateRequest =>
  getComponentTemplateFromFieldMap({
    name: getComponentTemplateName(context),
    fieldMap,
    // set field limit slightly higher than actual number of fields
    fieldLimit: 100, // Math.round(Object.keys(fieldMap).length * 1.5),
  });
