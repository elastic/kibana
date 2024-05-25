/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
import nunjucks from 'nunjucks';
import { Integration, DataStream } from '../../common';

export function createPackageManifest(packageDir: string, integration: Integration) {
  const manifestTemplatesDir = path.join(__dirname, '../templates/manifest');
  const uniqueInputs: { [key: string]: { type: string; title: string; description: string } } = {};

  integration.dataStreams.forEach((dataStream: DataStream) => {
    dataStream.inputTypes.forEach((inputType: string) => {
      if (!uniqueInputs[inputType]) {
        uniqueInputs[inputType] = {
          type: inputType,
          title: dataStream.title,
          description: dataStream.description,
        };
      }
    });
  });

  const uniqueInputsList = Object.values(uniqueInputs);

  nunjucks.configure(manifestTemplatesDir, { autoescape: true });

  const template = nunjucks.render('package.yml.j2', {
    format_version: integration.formatVersion,
    package_title: integration.title,
    package_name: integration.name,
    package_version: integration.initialVersion,
    package_description: integration.description,
    package_owner: integration.owner,
    min_version: integration.minKibanaVersion,
    inputs: uniqueInputsList,
  });

  fs.writeFileSync(path.join(packageDir, 'manifest.yml'), template, { encoding: 'utf-8' });
}
