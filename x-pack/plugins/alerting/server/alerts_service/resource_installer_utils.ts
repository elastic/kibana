/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { FieldMap } from '@kbn/alerts-as-data-utils';
import { getComponentTemplateFromFieldMap } from '../../common';

interface GetComponentTemplateNameOpts {
  context?: string;
  name?: string;
}
export const getComponentTemplateName = ({ context, name }: GetComponentTemplateNameOpts = {}) =>
  `.alerts-${context ? `${context}.alerts` : name ? name : 'framework'}-mappings`;

export interface IIndexPatternString {
  template: string;
  pattern: string;
  alias: string;
  name: string;
  basePattern: string;
  secondaryAlias?: string;
}

interface GetIndexTemplateAndPatternOpts {
  context: string;
  secondaryAlias?: string;
  namespace?: string;
}

export const getIndexTemplateAndPattern = ({
  context,
  namespace,
  secondaryAlias,
}: GetIndexTemplateAndPatternOpts): IIndexPatternString => {
  const concreteNamespace = namespace ? namespace : 'default';
  const pattern = `${context}.alerts`;
  const patternWithNamespace = `${pattern}-${concreteNamespace}`;
  return {
    template: `.alerts-${patternWithNamespace}-index-template`, // still used
    pattern: `.internal.alerts-${patternWithNamespace}-*`, // no longer used
    basePattern: `.alerts-${pattern}-*`,
    name: `.internal.alerts-${patternWithNamespace}-000001`, // no longer used
    alias: `.alerts-${patternWithNamespace}`, // data stream name
    ...(secondaryAlias ? { secondaryAlias: `${secondaryAlias}-${concreteNamespace}` } : {}),
  };
};

type GetComponentTemplateOpts = GetComponentTemplateNameOpts & {
  fieldMap: FieldMap;
  dynamic?: 'strict' | false;
  includeSettings?: boolean;
};

export const getComponentTemplate = ({
  fieldMap,
  context,
  name,
  dynamic,
  includeSettings,
}: GetComponentTemplateOpts): ClusterPutComponentTemplateRequest =>
  getComponentTemplateFromFieldMap({
    name: getComponentTemplateName({ context, name }),
    fieldMap,
    dynamic,
    includeSettings,
  });
