/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestUtils } from 'src/plugins/es_ui_shared/public';
import { TemplateDeserialized, DEFAULT_INDEX_TEMPLATE_VERSION_FORMAT } from '../../common';

const { getRandomString, getRandomNumber } = TestUtils;

export const getTemplate = ({
  name = getRandomString(),
  version = getRandomNumber(),
  order = getRandomNumber(),
  indexPatterns = [],
  template: { settings, aliases, mappings } = {},
  isManaged = false,
  templateFormatVersion = DEFAULT_INDEX_TEMPLATE_VERSION_FORMAT,
}: Partial<
  TemplateDeserialized & {
    templateFormatVersion?: 1 | 2;
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
  isManaged,
  _kbnMeta: {
    formatVersion: templateFormatVersion,
  },
});
