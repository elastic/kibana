/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IBasePath } from '../../../../../../../src/core/public';

export function getUpgradeAssistantHref(basePath: IBasePath) {
  return basePath.prepend('/app/management/stack/upgrade_assistant');
}
