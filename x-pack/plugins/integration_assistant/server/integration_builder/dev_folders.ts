/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join as joinPath } from 'path';
import nunjucks from 'nunjucks';
import { Integration } from '../../common';
import { asyncEnsureDir, asyncCreate } from '../util';

export async function createPackageSystemTests(integrationDir: string, integration: Integration) {
  const systemTestsDockerDir = joinPath(integrationDir, '_dev/deploy/docker/');
  const systemTestsSamplesDir = joinPath(systemTestsDockerDir, 'sample_logs');
  await asyncEnsureDir(systemTestsSamplesDir);

  const streamVersion = integration.streamVersion || '0.13.0';
  const dockerComposeVersion = integration.dockerComposeVersion || '2.3';
  const dockerServices: string[] = [];
  for (const stream of integration.dataStreams) {
    const packageName = integration.name.replace(/_/g, '-');
    const dataStreamName = stream.name.replace(/_/g, '-');

    const systemTestFileName = joinPath(
      systemTestsSamplesDir,
      `test-${packageName}-${dataStreamName}.log`
    );
    const rawSamplesContent = stream.rawSamples.join('\n');
    await asyncCreate(systemTestFileName, rawSamplesContent);

    for (const inputType of stream.inputTypes) {
      const mappedValues = {
        package_name: packageName,
        data_stream_name: dataStreamName,
        stream_version: streamVersion,
      };
      const renderedService = nunjucks.render(`service-${inputType}.njk`, mappedValues);
      dockerServices.push(renderedService);
    }
  }

  const renderedDockerCompose = nunjucks.render('docker-compose.yml.njk', {
    services: dockerServices.join('\n'),
    docker_compose_version: dockerComposeVersion,
  });

  const dockerComposeFileName = joinPath(systemTestsDockerDir, 'docker-compose.yml');
  await asyncCreate(dockerComposeFileName, renderedDockerCompose);
}
