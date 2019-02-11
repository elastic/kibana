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
  const logger = createTaggedLogger(server, ['reporting', 'csv', 'debug']);
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
      basePath
    } = job;

    let decryptedHeaders;
    try {
      decryptedHeaders = await crypto.decrypt(serializedEncryptedHeaders);
    } catch (e) {
      throw new Error(i18n.translate('xpack.reporting.exportTypes.csv.executeJob.failedToDecryptReportJobDataErrorMessage', {
        defaultMessage: 'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report.',
        values: { encryptionKey: 'xpack.reporting.encryptionKey' }
      }));
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
    const uiSettings = server.uiSettingsServiceFactory({
      savedObjectsClient
    });

    const fieldFormats = await server.fieldFormatServiceFactory(uiSettings);
    const formatsMap = fieldFormatMapFactory(indexPatternSavedObject, fieldFormats);

    const separator = await uiSettings.get('csv:separator');
    const quoteValues = await uiSettings.get('csv:quoteValues');
    const maxSizeBytes = config.get('xpack.reporting.csv.maxSizeBytes');
    const scroll = config.get('xpack.reporting.csv.scroll');

    const { content, maxSizeReached, size } = await generateCsv({
      searchRequest,
      fields,
      formatsMap,
      metaFields,
      conflictedTypesFields,
      callEndpoint,
      cancellationToken,
      settings: {
        separator,
        quoteValues,
        maxSizeBytes,
        scroll
      }
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
