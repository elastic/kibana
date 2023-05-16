/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger, PluginInitializerContext } from '@kbn/core/server';
import {
  format as urlFormat,
  parse as urlParse,
  UrlWithParsedQuery,
  UrlWithStringQuery,
} from 'url';
import { createConfig, ReportingConfigType } from '../../config';
import { ReportingServerInfo } from '../../core';
import { TaskPayloadPNG } from '../png/types';
import { TaskPayloadPDF } from '../printable_pdf/types';
import { PngCore } from './generate_png';
import { getAbsoluteUrlFactory } from './get_absolute_url';
import { validateUrls } from './validate_urls';

export class UrlCore {
  private config: ReportingConfigType;
  // will this come from the plugin setup
  core!: CoreSetup;

  constructor(
    core: CoreSetup,
    logger: Logger,
    private context: PluginInitializerContext<ReportingConfigType>
  ) {
    const config = createConfig(core, context.config.get<ReportingConfigType>(), logger);
    this.config = config;
  }

  /*
   * Gives synchronous access to the config
   */
  public getConfig(): ReportingConfigType {
    return this.config;
  }
  /*
   * Returns configurable server info
   */
  public getServerInfo(): ReportingServerInfo {
    const { http } = this.core;
    const serverInfo = http.getServerInfo();
    return {
      basePath: this.core.http.basePath.serverBasePath,
      hostname: serverInfo.hostname,
      name: serverInfo.name,
      port: serverInfo.port,
      uuid: this.context.env.instanceUuid,
      protocol: serverInfo.protocol,
    };
  }
}

function isPngJob(job: TaskPayloadPNG | TaskPayloadPDF): job is TaskPayloadPNG {
  return (job as TaskPayloadPNG).relativeUrl !== undefined;
}
function isPdfJob(job: TaskPayloadPNG | TaskPayloadPDF): job is TaskPayloadPDF {
  return (job as TaskPayloadPDF).objects !== undefined;
}

export type ReportingExportTypeCore = UrlCore & PngCore;

export function getFullUrls(
  reporting: ReportingExportTypeCore,
  job: TaskPayloadPDF | TaskPayloadPNG
) {
  const serverInfo = reporting.getServerInfo();
  const {
    kibanaServer: { protocol, hostname, port },
  } = reporting.getConfig();
  const getAbsoluteUrl = getAbsoluteUrlFactory({
    basePath: serverInfo.basePath,
    protocol: protocol ?? serverInfo.protocol,
    hostname: hostname ?? serverInfo.hostname,
    port: port ?? serverInfo.port,
  });

  // PDF and PNG job params put in the url differently
  let relativeUrls: string[] = [];

  if (isPngJob(job)) {
    relativeUrls = [job.relativeUrl];
  } else if (isPdfJob(job)) {
    relativeUrls = job.objects.map((obj) => obj.relativeUrl);
  } else {
    throw new Error(
      `No valid URL fields found in Job Params! Expected \`job.relativeUrl\` or \`job.objects[{ relativeUrl }]\``
    );
  }

  validateUrls(relativeUrls);

  const urls = relativeUrls.map((relativeUrl) => {
    const parsedRelative: UrlWithStringQuery = urlParse(relativeUrl); // FIXME: '(urlStr: string): UrlWithStringQuery' is deprecated
    const jobUrl = getAbsoluteUrl({
      path: parsedRelative.pathname === null ? undefined : parsedRelative.pathname,
      hash: parsedRelative.hash === null ? undefined : parsedRelative.hash,
      search: parsedRelative.search === null ? undefined : parsedRelative.search,
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
