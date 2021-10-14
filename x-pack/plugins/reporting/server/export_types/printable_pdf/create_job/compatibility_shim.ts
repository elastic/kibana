/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'kibana/server';
import { url as urlUtils } from '../../../../../../../src/plugins/kibana_utils/server';
import type { LevelLogger } from '../../../lib';
import type { CreateJobFn, ReportingRequestHandlerContext } from '../../../types';
import type { JobParamsPDF, JobParamsPDFLegacy, TaskPayloadPDF } from '../types';

function isLegacyJob(
  jobParams: JobParamsPDF | JobParamsPDFLegacy
): jobParams is JobParamsPDFLegacy {
  return (jobParams as JobParamsPDFLegacy).savedObjectId != null;
}

const getSavedObjectTitle = async (
  objectType: string,
  savedObjectId: string,
  savedObjectsClient: SavedObjectsClientContract
) => {
  const savedObject = await savedObjectsClient.get<{ title: string }>(objectType, savedObjectId);
  return savedObject.attributes.title;
};

const getSavedObjectRelativeUrl = (
  objectType: string,
  savedObjectId: string,
  queryString: string
) => {
  const appPrefixes: Record<string, string> = {
    dashboard: '/dashboard/',
    visualization: '/visualize/edit/',
    search: '/discover/',
  };

  const appPrefix = appPrefixes[objectType];
  if (!appPrefix) throw new Error('Unexpected app type: ' + objectType);

  const hash = appPrefix + urlUtils.encodeUriQuery(savedObjectId, true);

  return `/app/kibana#${hash}?${queryString || ''}`;
};

/*
 * The compatibility shim is responsible for migrating an older shape of the
 * PDF Job Params into a newer shape, by deriving a report title and relative
 * URL from a savedObjectId and queryString.
 */
export function compatibilityShim(
  createJobFn: CreateJobFn<JobParamsPDF, TaskPayloadPDF>,
  logger: LevelLogger
) {
  return async function (
    jobParams: JobParamsPDF | JobParamsPDFLegacy,
    context: ReportingRequestHandlerContext
  ) {
    let kibanaRelativeUrls = (jobParams as JobParamsPDF).relativeUrls;
    let reportTitle = jobParams.title;
    let isDeprecated = false;

    if (
      (jobParams as JobParamsPDFLegacy).savedObjectId &&
      (jobParams as JobParamsPDF).relativeUrls
    ) {
      throw new Error(`savedObjectId should not be provided if relativeUrls are provided`);
    }

    if (isLegacyJob(jobParams)) {
      const { savedObjectId, objectType, queryString } = jobParams;

      // input validation and deprecation logging
      if (typeof savedObjectId !== 'string') {
        throw new Error('Invalid savedObjectId (deprecated). String is expected.');
      }
      if (typeof objectType !== 'string') {
        throw new Error('Invalid objectType (deprecated). String is expected.');
      }

      // legacy parameters need to be converted into a relative URL
      kibanaRelativeUrls = [getSavedObjectRelativeUrl(objectType, savedObjectId, queryString)];
      logger.warn(
        `The relativeUrls have been derived from saved object parameters. ` +
          `This functionality will be removed with the next major version.`
      );

      // legacy parameters might need to get the title from the saved object
      if (!reportTitle) {
        try {
          reportTitle = await getSavedObjectTitle(
            objectType,
            savedObjectId,
            context.core.savedObjects.client
          );
          logger.warn(
            `The title has been derived from saved object parameters. This ` +
              `functionality will be removed with the next major version.`
          );
        } catch (err) {
          logger.error(err); // 404 for the savedObjectId, etc
          throw err;
        }
      }

      isDeprecated = true;
    }

    if (typeof reportTitle !== 'string') {
      logger.warn(
        `A title parameter should be provided with the job generation ` +
          `request. Please use Kibana to regenerate your POST URL to have a ` +
          `title included in the PDF.`
      );
      reportTitle = '';
    }

    const transformedJobParams: JobParamsPDF = {
      ...jobParams,
      title: reportTitle,
      relativeUrls: kibanaRelativeUrls,
      isDeprecated, // tack on this flag so it will be saved the TaskPayload
    };

    return await createJobFn(transformedJobParams, context);
  };
}
