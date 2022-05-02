/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCREENSHOT_IMAGE_ALT = (pageName: string) =>
  i18n.translate('xpack.securitySolution.landing.threatHunting.pageImageAlt', {
    values: { pageName },
    defaultMessage: '{pageName} page screenshot',
  });
