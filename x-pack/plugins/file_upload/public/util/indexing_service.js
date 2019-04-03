/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { http } from './http_service';
import chrome from 'ui/chrome';
import { chunk } from 'lodash';
import { i18n } from '@kbn/i18n';

const CHUNK_SIZE = 10000;
const IMPORT_RETRIES = 5;
const basePath = chrome.addBasePath('/api/fileupload');

export async function triggerIndexing(parsedFile, indexingDetails) {
  if (!parsedFile) {
    throw('No file imported');
    return;
  }
  // const parsedFileArr = splitJsonString(parsedFile);
  const initializedIndex = await writeToIndex({
    id: undefined,
    data: [],
    ...indexingDetails
  });
  if (!initializedIndex) {
    throw(`Unable to create index: ${initializedIndex}`);
  }
  await populateIndex({
    id: initializedIndex.id,
    data: parsedFile,
    ...indexingDetails,
    settings: {},
    mappings: {},
  });
}

function splitJsonString(parsedFile) {
  try {
    const splitJson = parsedFile.split(/}\s*\n/);

    const jsonArr = [];
    for (let i = 0; i < splitJson.length; i++) {
      if (splitJson[i] !== '') {
        // note the extra } at the end of the line, adding back
        // the one that was eaten in the split
        jsonArr.push(`${splitJson[i]}}`);
      }
    }

    // this.docArray = jsonArr;
    console.log(jsonArr)

    return jsonArr;
  } catch (error) {
    console.log(error);
    return [];
  }
}

function writeToIndex(indexingDetails) {
  const paramString = (indexingDetails.id !== undefined) ? `?id=${indexingDetails.id}` : '';
  const {
    index,
    data,
    settings,
    mappings,
    ingestPipeline
  } = indexingDetails;

  return http({
    url: `${basePath}/import${paramString}`,
    method: 'POST',
    data: {
      index,
      data,
      settings,
      mappings,
      ingestPipeline,
    }
  });
}

async function populateIndex({ id, index, data, mappings, settings }) {
  if (!id || !index) {
    return {
      success: false,
      error: i18n.translate('xpack.ml.fileDatavisualizer.importView.noIdOrIndexSuppliedErrorMessage', {
        defaultMessage: 'no ID or index supplied'
      })
    };
  }

  const chunks = chunk(data, CHUNK_SIZE);

  let success = true;
  const failures = [];
  let error;

  for (let i = 0; i < chunks.length; i++) {
    const aggs = {
      id,
      index,
      data: chunks[i],
      settings,
      mappings,
      ingestPipeline: {}
    };

    let retries = IMPORT_RETRIES;
    let resp = {
      success: false,
      failures: [],
      docCount: 0,
    };

    while (resp.success === false && retries > 0) {
      resp = await writeToIndex(aggs);

      if (retries < IMPORT_RETRIES) {
        console.log(`Retrying import ${IMPORT_RETRIES - retries}`);
      }

      retries--;
    }

    if (resp.success) {
      console.log('yes!');
    } else {
      console.error(resp);
      success = false;
      error = resp.error;
      break;
    }
  }

  const result = {
    success,
    failures,
    docCount: this.docArray.length,
  };

  if (success) {
    console.log('yay!');
  } else {
    result.error = error;
  }

  return result;
}
