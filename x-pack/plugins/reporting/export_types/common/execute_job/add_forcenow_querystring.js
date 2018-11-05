/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import url from 'url';
import { getAbsoluteUrlFactory } from './get_absolute_url';

function  getSavedObjectAbsoluteUrl(job, relativeUrl) {
  const getAbsoluteUrl = getAbsoluteUrlFactory(job.server);

  if (relativeUrl) {
    const { pathname: path, hash, search } = url.parse(relativeUrl);
    return getAbsoluteUrl({ basePath: job.basePath, path, hash, search });
  }

  throw new Error(`Unable to generate report. Url is not defined.`);
}

export const  addForceNowQuerystring = async ({ job, conditionalHeaders, logo,  }) => {

  //if no URLS then its from PNG which should only have one so put it in the array and process as PDF does
  if (!job.urls) {
    if (!job.relativeUrl) {
      throw new Error(`Unable to generate report. Url is not defined.`);}
    job.urls = [getSavedObjectAbsoluteUrl(job, job.relativeUrl)];
  }

  const urls = job.urls.map(jobUrl => {
    if (!job.forceNow) {
      return  jobUrl;
    }

    const parsed = url.parse(jobUrl, true);
    const hash = url.parse(parsed.hash.replace(/^#/, ''), true);

    const transformedHash = url.format({
      pathname: hash.pathname,
      query: {
        ...hash.query,
        forceNow: job.forceNow
      }
    });

    return url.format({
      ...parsed,
      hash: transformedHash
    });
  });

  return { job, conditionalHeaders, logo, urls };

};