/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRandomString, getRandomNumber } from '../../../../test_utils';
import { TemplateDeserialized } from '../../common';

export const getTemplate = ({
  name = getRandomString(),
  version = getRandomNumber(),
  order = getRandomNumber(),
  indexPatterns = [],
  template: { settings, aliases, mappings } = {},
  isManaged = false,
  isCloudManaged = false,
  hasDatastream = false,
  isLegacy = false,
}: Partial<
  TemplateDeserialized & {
    isLegacy?: boolean;
    isManaged: boolean;
    isCloudManaged: boolean;
    hasDatastream: boolean;
  }
> = {}): TemplateDeserialized => ({
  name,
  version,
  order,
  indexPatterns,
  template: {
    aliases,
    mappings,
    settings,
  },
  _kbnMeta: {
    isManaged,
    isCloudManaged,
    hasDatastream,
    isLegacy,
  },
});
