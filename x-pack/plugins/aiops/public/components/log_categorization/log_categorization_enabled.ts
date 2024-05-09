/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { firstValueFrom } from 'rxjs';

export function getPatternAnalysisAvailable(licensing: LicensingPluginStart) {
  return async (dataView: DataView) => {
    const hasTextFields = dataView.fields.some((f) => f.esTypes?.includes(ES_FIELD_TYPES.TEXT));
    const isPlatinum = (await firstValueFrom(licensing.license$)).hasAtLeast('platinum');
    return isPlatinum && hasTextFields;
  };
}
