/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cryptoFactory } from '../../../server/lib/crypto';
import { oncePerServer } from '../../../server/lib/once_per_server';
import { createTaggedLogger } from '../../../server/lib/create_tagged_logger';
import { createGenerateCsv } from './lib/generate_csv';
import { fieldFormatMapFactory } from './lib/field_format_map';
import { i18n } from '@kbn/i18n';

function executeJobFn(server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  const crypto = cryptoFactory(server);
  const config = server.config();
  const logger = {
    debug: createTaggedLogger(server, ['reporting', 'csv', 'debug']),
    warn: createTaggedLogger(server, ['reporting', 'csv', 'warning']),
  };
  const generateCsv = createGenerateCsv(logger);
  const serverBasePath = config.get('server.basePath');

  return async function executeJob(job, cancellationToken) {
    const {
      searchRequest,
      fields,
      indexPatternSavedObject,
      metaFields,
      conflictedTypesFields,
      headers: serializedEncryptedHeaders,
      basePath,
    } = job;

    let decryptedHeaders;
    try {
      decryptedHeaders = await crypto.decrypt(serializedEncryptedHeaders);
    } catch (e) {
      throw new Error(
        i18n.translate(
          'xpack.reporting.exportTypes.csv.executeJob.failedToDecryptReportJobDataErrorMessage',
          {
            defaultMessage:
              'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report.',
            values: { encryptionKey: 'xpack.reporting.encryptionKey' },
          }
        )
      );
    }

    const fakeRequest = {
      headers: decryptedHeaders,
      // This is used by the spaces SavedObjectClientWrapper to determine the existing space.
      // We use the basePath from the saved job, which we'll have post spaces being implemented;
      // or we use the server base path, which uses the default space
      getBasePath: () => basePath || serverBasePath,
    };

    const callEndpoint = (endpoint, clientParams = {}, options = {}) => {
      return callWithRequest(fakeRequest, endpoint, clientParams, options);
    };
    const savedObjects = server.savedObjects;
    const savedObjectsClient = savedObjects.getScopedSavedObjectsClient(fakeRequest);
    const uiConfig = server.uiSettingsServiceFactory({
      savedObjectsClient,
    });

    const [formatsMap, uiSettings] = await Promise.all([
      (async () => {
        const fieldFormats = await server.fieldFormatServiceFactory(uiConfig);
        return fieldFormatMapFactory(indexPatternSavedObject, fieldFormats);
      })(),
      (async () => {
        const [separator, quoteValues, timezone] = await Promise.all([
          uiConfig.get('csv:separator'),
          uiConfig.get('csv:quoteValues'),
          uiConfig.get('dateFormat:tz'),
        ]);

        if (timezone === 'Browser') {
          logger.warn(`Kibana Advanced Setting "dateFormat:tz" is set to "Browser". Dates will be formatted as UTC to avoid ambiguity.`);
        }

        return {
          separator,
          quoteValues,
          timezone,
        };
      })(),
    ]);

    const { content, maxSizeReached, size } = await generateCsv({
      searchRequest,
      fields,
      metaFields,
      conflictedTypesFields,
      callEndpoint,
      cancellationToken,
      formatsMap,
      settings: {
        ...uiSettings,
        maxSizeBytes: config.get('xpack.reporting.csv.maxSizeBytes'),
        scroll: config.get('xpack.reporting.csv.scroll'),
      },
    });

    return {
      content_type: 'text/csv',
      content,
      max_size_reached: maxSizeReached,
      size,
    };
  };
}

export const executeJobFactory = oncePerServer(executeJobFn);
