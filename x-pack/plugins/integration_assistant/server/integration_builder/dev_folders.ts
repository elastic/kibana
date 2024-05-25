/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
import nunjucks from 'nunjucks';
import { Integration } from '../../common';
import { ensureDir } from '../util/util';

export function createPackageSystemTests(integrationDir: string, integration: Integration) {
  const systemTestsTemplatesDir = path.join(__dirname, '../templates/system_tests');
  const systemTestsDockerDir = path.join(integrationDir, '_dev/deploy/docker/');
  const systemTestsSamplesDir = path.join(systemTestsDockerDir, 'sample_logs');
  ensureDir(systemTestsSamplesDir);

  nunjucks.configure(systemTestsTemplatesDir, { autoescape: true });

  const systemTestDockerTemplate = fs.readFileSync(
    path.join(systemTestsTemplatesDir, 'docker-compose.yml.j2'),
    'utf-8'
  );
  const streamVersion = integration.streamVersion || '0.13.0';
  const dockerComposeVersion = integration.dockerComposeVersion || '2.3';
  const dockerServices: string[] = [];
  for (const stream of integration.dataStreams) {
    const packageName = integration.name.replace(/_/g, '-');
    const dataStreamName = stream.name.replace(/_/g, '-');

    const systemTestFileName = path.join(
      systemTestsSamplesDir,
      `test-${packageName}-${dataStreamName}.log`
    );
    const rawSamplesContent = stream.rawSamples.join('\n');
    fs.writeFileSync(systemTestFileName, rawSamplesContent, 'utf-8');

    for (const inputType of stream.inputTypes) {
      const systemTestServiceTemplate = fs.readFileSync(
        path.join(systemTestsTemplatesDir, `service-${inputType}.j2`),
        'utf-8'
      );
      const mappedValues = {
        package_name: packageName,
        data_stream_name: dataStreamName,
        stream_version: streamVersion,
      };
      const renderedService = nunjucks.renderString(systemTestServiceTemplate, mappedValues);
      dockerServices.push(renderedService);
    }
  }

  const renderedDockerCompose = nunjucks.renderString(systemTestDockerTemplate, {
    services: dockerServices.join('\n'),
    docker_compose_version: dockerComposeVersion,
  });

  const dockerComposeFileName = path.join(systemTestsDockerDir, 'docker-compose.yml');
  fs.writeFileSync(dockerComposeFileName, renderedDockerCompose, 'utf-8');
}
