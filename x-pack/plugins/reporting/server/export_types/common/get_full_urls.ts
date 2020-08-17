/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  format as urlFormat,
  parse as urlParse,
  UrlWithParsedQuery,
  UrlWithStringQuery,
} from 'url';
import { ReportingConfig } from '../../';
import { ScheduledTaskParamsPNG } from '../png/types';
import { ScheduledTaskParamsPDF } from '../printable_pdf/types';
import { getAbsoluteUrlFactory } from './get_absolute_url';
import { validateUrls } from './validate_urls';

function isPngJob(
  job: ScheduledTaskParamsPNG | ScheduledTaskParamsPDF
): job is ScheduledTaskParamsPNG {
  return (job as ScheduledTaskParamsPNG).relativeUrl !== undefined;
}
function isPdfJob(
  job: ScheduledTaskParamsPNG | ScheduledTaskParamsPDF
): job is ScheduledTaskParamsPDF {
  return (job as ScheduledTaskParamsPDF).relativeUrls !== undefined;
}

export function getFullUrls<ScheduledTaskParamsType>({
  config,
  job,
}: {
  config: ReportingConfig;
  job: ScheduledTaskParamsPDF | ScheduledTaskParamsPNG;
}) {
  const [basePath, protocol, hostname, port] = [
    config.kbnConfig.get('server', 'basePath'),
    config.get('kibanaServer', 'protocol'),
    config.get('kibanaServer', 'hostname'),
    config.get('kibanaServer', 'port'),
  ] as string[];
  const getAbsoluteUrl = getAbsoluteUrlFactory({
    defaultBasePath: basePath,
    protocol,
    hostname,
    port,
  });

  // PDF and PNG job params put in the url differently
  let relativeUrls: string[] = [];

  if (isPngJob(job)) {
    relativeUrls = [job.relativeUrl];
  } else if (isPdfJob(job)) {
    relativeUrls = job.relativeUrls;
  } else {
    throw new Error(
      `No valid URL fields found in Job Params! Expected \`job.relativeUrl: string\` or \`job.relativeUrls: string[]\``
    );
  }

  validateUrls(relativeUrls);

  const urls = relativeUrls.map((relativeUrl) => {
    const parsedRelative: UrlWithStringQuery = urlParse(relativeUrl);
    const jobUrl = getAbsoluteUrl({
      basePath: job.basePath,
      path: parsedRelative.pathname,
      hash: parsedRelative.hash,
      search: parsedRelative.search,
    });

    // capture the route to the visualization
    const parsed: UrlWithParsedQuery = urlParse(jobUrl, true);
    if (parsed.hash == null) {
      throw new Error(
        'No valid hash in the URL! A hash is expected for the application to route to the intended visualization.'
      );
    }

    // allow the hash check to perform first
    if (!job.forceNow) {
      return jobUrl;
    }

    const visualizationRoute: UrlWithParsedQuery = urlParse(parsed.hash.replace(/^#/, ''), true);

    // combine the visualization route and forceNow parameter into a URL
    const transformedHash = urlFormat({
      pathname: visualizationRoute.pathname,
      query: {
        ...visualizationRoute.query,
        forceNow: job.forceNow,
      },
    });

    return urlFormat({
      ...parsed,
      hash: transformedHash,
    });
  });

  return urls;
}
