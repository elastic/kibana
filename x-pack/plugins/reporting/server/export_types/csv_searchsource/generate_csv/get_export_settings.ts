/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import type { IUiSettingsClient, Logger } from 'kibana/server';
import { createEscapeValue } from '../../../../../../../src/plugins/data/common';
import { ReportingConfig } from '../../../';
import {
  CSV_BOM_CHARS,
  UI_SETTINGS_CSV_QUOTE_VALUES,
  UI_SETTINGS_CSV_SEPARATOR,
  UI_SETTINGS_DATEFORMAT_TZ,
  UI_SETTINGS_SEARCH_INCLUDE_FROZEN,
} from '../../../../common/constants';

export interface CsvExportSettings {
  timezone: string;
  scroll: {
    size: number;
    duration: string;
  };
  bom: string;
  separator: string;
  maxSizeBytes: number | ByteSizeValue;
  checkForFormulas: boolean;
  escapeFormulaValues: boolean;
  escapeValue: (value: string) => string;
  includeFrozen: boolean;
}

export const getExportSettings = async (
  client: IUiSettingsClient,
  config: ReportingConfig,
  timezone: string | undefined,
  logger: Logger
): Promise<CsvExportSettings> => {
  let setTimezone: string;
  if (timezone) {
    setTimezone = timezone;
  } else {
    // timezone in settings?
    setTimezone = await client.get(UI_SETTINGS_DATEFORMAT_TZ);
    if (setTimezone === 'Browser') {
      // if `Browser`, hardcode it to 'UTC' so the export has data that makes sense
      logger.warn(
        `Kibana Advanced Setting "dateFormat:tz" is set to "Browser". Dates will be formatted as UTC to avoid ambiguity.`
      );
      setTimezone = 'UTC';
    }
  }

  // Advanced Settings that affect search export + CSV
  const [includeFrozen, separator, quoteValues] = await Promise.all([
    client.get(UI_SETTINGS_SEARCH_INCLUDE_FROZEN),
    client.get(UI_SETTINGS_CSV_SEPARATOR),
    client.get(UI_SETTINGS_CSV_QUOTE_VALUES),
  ]);

  const escapeFormulaValues = config.get('csv', 'escapeFormulaValues');
  const escapeValue = createEscapeValue(quoteValues, escapeFormulaValues);
  const bom = config.get('csv', 'useByteOrderMarkEncoding') ? CSV_BOM_CHARS : '';

  return {
    timezone: setTimezone,
    scroll: {
      size: config.get('csv', 'scroll', 'size'),
      duration: config.get('csv', 'scroll', 'duration'),
    },
    bom,
    includeFrozen,
    separator,
    maxSizeBytes: config.get('csv', 'maxSizeBytes'),
    checkForFormulas: config.get('csv', 'checkForFormulas'),
    escapeFormulaValues,
    escapeValue,
  };
};
