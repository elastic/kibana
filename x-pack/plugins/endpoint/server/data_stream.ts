/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import fetch from 'node-fetch';
import * as url from 'url';
import Boom from 'boom';
import { EPM_DATA_STREAM, GetDataStreamResponse } from '../../ingest_manager/common';

export async function getDataStreamName(
  packageName: string,
  datasetPath: string,
  version?: string
): Promise<GetDataStreamResponse> {
  try {
    const streamURL = new url.URL(packageName, EPM_DATA_STREAM);
    streamURL.searchParams.append('datasetPath', datasetPath);
    if (version) {
      streamURL.searchParams.append('version', version);
    }
    const response = await fetch(streamURL.toString());
    if (response.ok) {
      return await response.json();
    } else {
      throw new Boom(response.statusText, { statusCode: response.status });
    }
  } catch (e) {
    throw Boom.boomify(e);
  }
}
