/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { USER_SETTINGS_TEMPLATE_SUFFIX } from '../../../../constants';

type TemplateBaseName = string;
type UserSettingsTemplateName = `${TemplateBaseName}${typeof USER_SETTINGS_TEMPLATE_SUFFIX}`;

export const isUserSettingsTemplate = (name: string): name is UserSettingsTemplateName =>
  name.endsWith(USER_SETTINGS_TEMPLATE_SUFFIX);
