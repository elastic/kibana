/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import Hapi from 'hapi';
import { IUiSettingsClient, KibanaRequest } from '../../../../../../../src/core/server';
import {
  CSV_QUOTE_VALUES_SETTING,
  CSV_SEPARATOR_SETTING,
} from '../../../../../../../src/plugins/share/server';
import { CSV_BOM_CHARS, CSV_JOB_TYPE } from '../../../../common/constants';
import { getFieldFormats } from '../../../../server/services';
import { cryptoFactory } from '../../../lib';
import { ESQueueWorkerExecuteFn, RunTaskFnFactory } from '../../../types';
import { ScheduledTaskParamsCSV } from '../types';
import { fieldFormatMapFactory } from './lib/field_format_map';
import { createGenerateCsv } from './lib/generate_csv';

export const runTaskFnFactory: RunTaskFnFactory<ESQueueWorkerExecuteFn<
  ScheduledTaskParamsCSV
>> = function executeJobFactoryFn(reporting, parentLogger) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));
  const logger = parentLogger.clone([CSV_JOB_TYPE, 'execute-job']);
  const serverBasePath = config.kbnConfig.get('server', 'basePath');

  return async function runTask(jobId, job, cancellationToken) {
    const elasticsearch = reporting.getElasticsearchService();
    const jobLogger = logger.clone([jobId]);

    const {
      searchRequest,
      fields,
      indexPatternSavedObject,
      metaFields,
      conflictedTypesFields,
      headers,
      basePath,
    } = job;

    const decryptHeaders = async () => {
      try {
        if (typeof headers !== 'string') {
          throw new Error(
            i18n.translate(
              'xpack.reporting.exportTypes.csv.executeJob.missingJobHeadersErrorMessage',
              {
                defaultMessage: 'Job headers are missing',
              }
            )
          );
        }
        return await crypto.decrypt(headers);
      } catch (err) {
        logger.error(err);
        throw new Error(
          i18n.translate(
            'xpack.reporting.exportTypes.csv.executeJob.failedToDecryptReportJobDataErrorMessage',
            {
              defaultMessage: 'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report. {err}',
              values: { encryptionKey: 'xpack.reporting.encryptionKey', err: err.toString() },
            }
          )
        ); // prettier-ignore
      }
    };

    const fakeRequest = KibanaRequest.from({
      headers: await decryptHeaders(),
      // This is used by the spaces SavedObjectClientWrapper to determine the existing space.
      // We use the basePath from the saved job, which we'll have post spaces being implemented;
      // or we use the server base path, which uses the default space
      getBasePath: () => basePath || serverBasePath,
      path: '/',
      route: { settings: {} },
      url: { href: '/' },
      raw: { req: { url: '/' } },
    } as Hapi.Request);

    const { callAsCurrentUser } = elasticsearch.legacy.client.asScoped(fakeRequest);
    const callEndpoint = (endpoint: string, clientParams = {}, options = {}) =>
      callAsCurrentUser(endpoint, clientParams, options);

    const savedObjectsClient = await reporting.getSavedObjectsClient(fakeRequest);
    const uiSettingsClient = await reporting.getUiSettingsServiceFactory(savedObjectsClient);

    const getFormatsMap = async (client: IUiSettingsClient) => {
      const fieldFormats = await getFieldFormats().fieldFormatServiceFactory(client);
      return fieldFormatMapFactory(indexPatternSavedObject, fieldFormats);
    };
    const getUiSettings = async (client: IUiSettingsClient) => {
      const [separator, quoteValues, timezone] = await Promise.all([
        client.get(CSV_SEPARATOR_SETTING),
        client.get(CSV_QUOTE_VALUES_SETTING),
        client.get('dateFormat:tz'),
      ]);

      if (timezone === 'Browser') {
        logger.warn(
          i18n.translate('xpack.reporting.exportTypes.csv.executeJob.dateFormateSetting', {
            defaultMessage: 'Kibana Advanced Setting "{dateFormatTimezone}" is set to "Browser". Dates will be formatted as UTC to avoid ambiguity.',
            values: { dateFormatTimezone: 'dateFormat:tz' }
          })
        ); // prettier-ignore
      }

      return {
        separator,
        quoteValues,
        timezone,
      };
    };

    const [formatsMap, uiSettings] = await Promise.all([
      getFormatsMap(uiSettingsClient),
      getUiSettings(uiSettingsClient),
    ]);

    const generateCsv = createGenerateCsv(jobLogger);
    const bom = config.get('csv', 'useByteOrderMarkEncoding') ? CSV_BOM_CHARS : '';

    const { content, maxSizeReached, size, csvContainsFormulas, warnings } = await generateCsv({
      searchRequest,
      fields,
      metaFields,
      conflictedTypesFields,
      callEndpoint,
      cancellationToken,
      formatsMap,
      settings: {
        ...uiSettings,
        checkForFormulas: config.get('csv', 'checkForFormulas'),
        maxSizeBytes: config.get('csv', 'maxSizeBytes'),
        scroll: config.get('csv', 'scroll'),
        escapeFormulaValues: config.get('csv', 'escapeFormulaValues'),
      },
    });

    // @TODO: Consolidate these one-off warnings into the warnings array (max-size reached and csv contains formulas)
    return {
      content_type: 'text/csv',
      content: bom + content,
      max_size_reached: maxSizeReached,
      size,
      csv_contains_formulas: csvContainsFormulas,
      warnings,
    };
  };
};
