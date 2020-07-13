/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRandomString, getRandomNumber } from '../../../../test_utils';
import { TemplateDeserialized, TemplateType, TemplateListItem } from '../../common';

const objHasProperties = (obj?: Record<string, any>): boolean => {
  return obj === undefined || Object.keys(obj).length === 0 ? false : true;
};

export const getTemplate = ({
  name = getRandomString(),
  version = getRandomNumber(),
  order = getRandomNumber(),
  indexPatterns = [],
  template: { settings, aliases, mappings } = {},
  hasDatastream = false,
  isLegacy = false,
  type = 'default',
}: Partial<
  TemplateDeserialized & {
    isLegacy?: boolean;
    type?: TemplateType;
    hasDatastream: boolean;
  }
> = {}): TemplateDeserialized & TemplateListItem => {
  const indexTemplate = {
    name,
    version,
    order,
    indexPatterns,
    template: {
      aliases,
      mappings,
      settings,
    },
    hasSettings: objHasProperties(settings),
    hasMappings: objHasProperties(mappings),
    hasAliases: objHasProperties(aliases),
    _kbnMeta: {
      type,
      hasDatastream,
      isLegacy,
    },
  };

  return indexTemplate;
};
