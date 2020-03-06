/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseString } from 'xml2js';

// NP Migration
// Temporarily redundant with x-pack/legacy/plugins/maps/common/parse_xml_string.js
// promise based wrapper around parseString
export async function parseXmlString(xmlString) {
  const parsePromise = new Promise((resolve, reject) => {
    parseString(xmlString, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });

  return await parsePromise;
}
// End temporary redundancy
