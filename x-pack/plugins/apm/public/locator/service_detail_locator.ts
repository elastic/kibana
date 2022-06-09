/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IUiSettingsClient } from '@kbn/core/public';
import { LocatorDefinition } from '@kbn/share-plugin/common';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import {
  defaultApmServiceEnvironment,
  enableComparisonByDefault,
} from '@kbn/observability-plugin/common';
import { ENVIRONMENT_ALL } from '../../common/environment_filter_values';
import type { TimePickerTimeDefaults } from '../components/shared/date_picker/typings';
import type { APMLocatorPayload } from './helpers';

const helpersModule = import('./helpers');

export const APM_APP_LOCATOR_ID = 'APM_LOCATOR';

export class APMServiceDetailLocator
  implements LocatorDefinition<APMLocatorPayload>
{
  id = APM_APP_LOCATOR_ID;
  uiSettings: IUiSettingsClient;

  constructor(uiSettings: IUiSettingsClient) {
    this.uiSettings = uiSettings;
  }

  async getLocation(payload: APMLocatorPayload) {
    const { getPathForServiceDetail } = await helpersModule;

    const defaultTimeRange = this.uiSettings.get<TimePickerTimeDefaults>(
      UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
    );
    const isComparisonEnabledByDefault = this.uiSettings.get<boolean>(
      enableComparisonByDefault
    );
    const defaultEnvironment = this.uiSettings.get<string>(
      defaultApmServiceEnvironment,
      ENVIRONMENT_ALL.value
    );

    const path = getPathForServiceDetail(payload, {
      ...defaultTimeRange,
      isComparisonEnabledByDefault,
      defaultEnvironment,
    });

    return {
      app: 'apm',
      path,
      state: {},
    };
  }
}
