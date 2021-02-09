/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InstallTemplateFunction } from './types';

export const linuxInstallTemplate: InstallTemplateFunction = (variables) => {
  const artifact = `elastic-agent-${variables.kibanaVersion}-linux-x86_64`;

  return `#!/bin/sh

set -e
curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/${artifact}.tar.gz
tar -xzvf ${artifact}.tar.gz
cd ${artifact}
./elastic-agent enroll ${variables.kibanaUrl} $API_KEY --force
./elastic-agent run
`;
};
