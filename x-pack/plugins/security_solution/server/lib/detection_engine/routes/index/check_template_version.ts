/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { LegacyAPICaller } from '../../../../../../../../src/core/server';
import { getTemplateExists } from '../../index/get_template_exists';
import { SIGNALS_TEMPLATE_VERSION } from './get_signals_template';

export const templateNeedsUpdate = async (callCluster: LegacyAPICaller, index: string) => {
  const templateExists = await getTemplateExists(callCluster, index);
  if (!templateExists) {
    return true;
  }
  const existingTemplate: unknown = await callCluster('indices.getTemplate', {
    name: index,
  });
  const existingTemplateVersion: number | undefined = get(existingTemplate, [index, 'version']);
  if (existingTemplateVersion === undefined || existingTemplateVersion < SIGNALS_TEMPLATE_VERSION) {
    return true;
  }
  return false;
};
