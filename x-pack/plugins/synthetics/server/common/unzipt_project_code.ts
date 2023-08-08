/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'path';
import { writeFile } from 'fs/promises';
import os from 'os';
import AdmZip from 'adm-zip';

export function generateUniqueId() {
  return `${Date.now() + Math.floor(Math.random() * 1e13)}`;
}

export function generateTempPath() {
  return join(os.tmpdir(), `synthetics-${generateUniqueId()}`);
}

export async function unzipFile(content: string) {
  const decoded = Buffer.from(content, 'base64');
  const pathToZip = generateTempPath();
  await writeFile(pathToZip, decoded);
  const zip = new AdmZip(pathToZip);
  const zipEntries = zip.getEntries();

  let allData = '';

  for (const entry of zipEntries) {
    const entryData = entry.getData().toString();
    allData += entryData;
  }
  return allData;
}
