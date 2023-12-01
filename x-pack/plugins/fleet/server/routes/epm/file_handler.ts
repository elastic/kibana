/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import type { TypeOf } from '@kbn/config-schema';
import mime from 'mime-types';
import type { ResponseHeaders, KnownHeaders, HttpResponseOptions } from '@kbn/core/server';

import type { GetFileRequestSchema, FleetRequestHandler } from '../../types';
import { getFile, getInstallation } from '../../services/epm/packages';
import { defaultFleetErrorHandler } from '../../errors';
import { getArchiveEntry } from '../../services/epm/archive';
import { getAsset } from '../../services/epm/archive/storage';
import { getBundledPackageByPkgKey } from '../../services/epm/packages/bundled_packages';
import { pkgToPkgKey } from '../../services/epm/registry';
import { unpackBufferEntries } from '../../services/epm/archive';

const CACHE_CONTROL_10_MINUTES_HEADER: HttpResponseOptions['headers'] = {
  'cache-control': 'max-age=600',
};
export const getFileHandler: FleetRequestHandler<
  TypeOf<typeof GetFileRequestSchema.params>
> = async (context, request, response) => {
  try {
    const { pkgName, pkgVersion, filePath } = request.params;
    const savedObjectsClient = (await context.fleet).internalSoClient;

    const installation = await getInstallation({ savedObjectsClient, pkgName });
    const useLocalFile = pkgVersion === installation?.version;
    const assetPath = `${pkgName}-${pkgVersion}/${filePath}`;

    if (useLocalFile) {
      const fileBuffer = getArchiveEntry(assetPath);
      // only pull local installation if we don't have it cached
      const storedAsset = !fileBuffer && (await getAsset({ savedObjectsClient, path: assetPath }));

      // error, if neither is available
      if (!fileBuffer && !storedAsset) {
        return response.custom({
          body: `installed package file not found: ${filePath}`,
          statusCode: 404,
        });
      }

      // if storedAsset is not available, fileBuffer *must* be
      // b/c we error if we don't have at least one, and storedAsset is the least likely
      const { buffer, contentType } = storedAsset
        ? {
            contentType: storedAsset.media_type,
            buffer: storedAsset.data_utf8
              ? Buffer.from(storedAsset.data_utf8, 'utf8')
              : Buffer.from(storedAsset.data_base64, 'base64'),
          }
        : {
            contentType: mime.contentType(path.extname(assetPath)),
            buffer: fileBuffer,
          };

      if (!contentType) {
        return response.custom({
          body: `unknown content type for file: ${filePath}`,
          statusCode: 400,
        });
      }

      return response.custom({
        body: buffer,
        statusCode: 200,
        headers: {
          ...CACHE_CONTROL_10_MINUTES_HEADER,
          'content-type': contentType,
        },
      });
    }

    const bundledPackage = await getBundledPackageByPkgKey(
      pkgToPkgKey({ name: pkgName, version: pkgVersion })
    );
    if (bundledPackage) {
      const bufferEntries = await unpackBufferEntries(bundledPackage.buffer, 'application/zip');

      const fileBuffer = bufferEntries.find((entry) => entry.path === assetPath)?.buffer;

      if (!fileBuffer) {
        return response.custom({
          body: `bundled package file not found: ${filePath}`,
          statusCode: 404,
        });
      }

      // if storedAsset is not available, fileBuffer *must* be
      // b/c we error if we don't have at least one, and storedAsset is the least likely
      const { buffer, contentType } = {
        contentType: mime.contentType(path.extname(assetPath)),
        buffer: fileBuffer,
      };

      if (!contentType) {
        return response.custom({
          body: `unknown content type for file: ${filePath}`,
          statusCode: 400,
        });
      }

      return response.custom({
        body: buffer,
        statusCode: 200,
        headers: {
          ...CACHE_CONTROL_10_MINUTES_HEADER,
          'content-type': contentType,
        },
      });
    } else {
      const registryResponse = await getFile(pkgName, pkgVersion, filePath);
      const headersToProxy: KnownHeaders[] = ['content-type'];
      const proxiedHeaders = headersToProxy.reduce((headers, knownHeader) => {
        const value = registryResponse.headers.get(knownHeader);
        if (value !== null) {
          headers[knownHeader] = value;
        }
        return headers;
      }, {} as ResponseHeaders);

      return response.custom({
        body: registryResponse.body,
        statusCode: registryResponse.status,
        headers: { ...CACHE_CONTROL_10_MINUTES_HEADER, ...proxiedHeaders },
      });
    }
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
