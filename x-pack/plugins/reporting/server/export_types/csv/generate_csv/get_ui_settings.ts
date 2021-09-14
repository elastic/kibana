/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from 'kibana/server';
import {
  UI_SETTINGS_CSV_QUOTE_VALUES,
  UI_SETTINGS_CSV_SEPARATOR,
} from '../../../../common/constants';
import { ReportingConfig } from '../../../';
import { LevelLogger } from '../../../lib';

export const getUiSettings = async (
  timezone: string | undefined,
  client: IUiSettingsClient,
  config: ReportingConfig,
  logger: LevelLogger
) => {
  // Timezone
  let setTimezone: string;
  // look for timezone in job params
  if (timezone) {
    setTimezone = timezone;
  } else {
    // if empty, look for timezone in settings
    setTimezone = await client.get('dateFormat:tz');
    if (setTimezone === 'Browser') {
      // if `Browser`, hardcode it to 'UTC' so the export has data that makes sense
      logger.warn(
        i18n.translate('xpack.reporting.exportTypes.csv.executeJob.dateFormateSetting', {
          defaultMessage:
            'Kibana Advanced Setting "{dateFormatTimezone}" is set to "Browser". Dates will be formatted as UTC to avoid ambiguity.',
          values: { dateFormatTimezone: 'dateFormat:tz' },
        })
      );
      setTimezone = 'UTC';
    }
  }

  // Separator, QuoteValues
  const [separator, quoteValues] = await Promise.all([
    client.get(UI_SETTINGS_CSV_SEPARATOR),
    client.get(UI_SETTINGS_CSV_QUOTE_VALUES),
  ]);

  return {
    timezone: setTimezone,
    separator,
    quoteValues,
    escapeFormulaValues: config.get('csv', 'escapeFormulaValues'),
    maxSizeBytes: config.get('csv', 'maxSizeBytes'),
    scroll: config.get('csv', 'scroll'),
    checkForFormulas: config.get('csv', 'checkForFormulas'),
  };
};
