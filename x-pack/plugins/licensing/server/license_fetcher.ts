/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { createHash } from 'crypto';
import stringify from 'json-stable-stringify';
import type { MaybePromise } from '@kbn/utility-types';
import { isPromise } from '@kbn/std';
import type { IClusterClient, Logger } from '@kbn/core/server';
import type {
  ILicense,
  PublicLicense,
  PublicFeatures,
  LicenseType,
  LicenseStatus,
} from '../common/types';
import { License } from '../common/license';
import type { ElasticsearchError, LicenseFetcher } from './types';

export const getLicenseFetcher = ({
  clusterClient,
  logger,
  cacheDurationMs,
}: {
  clusterClient: MaybePromise<IClusterClient>;
  logger: Logger;
  cacheDurationMs: number;
}): LicenseFetcher => {
  let currentLicense: ILicense | undefined;
  let lastSuccessfulFetchTime: number | undefined;

  return async () => {
    const client = isPromise(clusterClient) ? await clusterClient : clusterClient;
    try {
      const response = await client.asInternalUser.xpack.info();
      const normalizedLicense =
        response.license && response.license.type !== 'missing'
          ? normalizeServerLicense(response.license)
          : undefined;
      const normalizedFeatures = response.features
        ? normalizeFeatures(response.features)
        : undefined;

      const signature = sign({
        license: normalizedLicense,
        features: normalizedFeatures,
        error: '',
      });

      currentLicense = new License({
        license: normalizedLicense,
        features: normalizedFeatures,
        signature,
      });
      lastSuccessfulFetchTime = Date.now();

      return currentLicense;
    } catch (error) {
      logger.warn(
        `License information could not be obtained from Elasticsearch due to ${error} error`
      );

      if (lastSuccessfulFetchTime && lastSuccessfulFetchTime + cacheDurationMs > Date.now()) {
        return currentLicense!;
      } else {
        const errorMessage = getErrorMessage(error);
        const signature = sign({ error: errorMessage });

        return new License({
          error: getErrorMessage(error),
          signature,
        });
      }
    }
  };
};

function normalizeServerLicense(
  license: estypes.XpackInfoMinimalLicenseInformation
): PublicLicense {
  return {
    uid: license.uid,
    type: license.type as LicenseType,
    mode: license.mode as LicenseType,
    expiryDateInMillis:
      typeof license.expiry_date_in_millis === 'string'
        ? parseInt(license.expiry_date_in_millis, 10)
        : license.expiry_date_in_millis,
    status: license.status as LicenseStatus,
  };
}

function normalizeFeatures(rawFeatures: estypes.XpackInfoFeatures) {
  const features: PublicFeatures = {};
  for (const [name, feature] of Object.entries(rawFeatures)) {
    features[name] = {
      isAvailable: feature.available,
      isEnabled: feature.enabled,
    };
  }
  return features;
}

function sign({
  license,
  features,
  error,
}: {
  license?: PublicLicense;
  features?: PublicFeatures;
  error?: string;
}) {
  return createHash('sha256')
    .update(
      stringify({
        license,
        features,
        error,
      })
    )
    .digest('hex');
}

function getErrorMessage(error: ElasticsearchError): string {
  if (error.status === 400) {
    return 'X-Pack plugin is not installed on the Elasticsearch cluster.';
  }
  return error.message;
}
