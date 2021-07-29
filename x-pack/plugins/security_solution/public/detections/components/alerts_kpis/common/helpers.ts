/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { showAllOthersBucket } from '../../../../../common/constants';
import type { AlertsStackByField } from './types';
import * as i18n from './translations';

export const MISSING_IP = '0.0.0.0';

export const getMissingFields = (stackByField: AlertsStackByField) =>
  showAllOthersBucket.includes(stackByField)
    ? {
        missing: stackByField.endsWith('.ip') ? MISSING_IP : i18n.ALL_OTHERS,
      }
    : {};
