/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryDataStream } from '../../../../types';

export interface PipelineInstall {
  nameForInstallation: string;
  contentForInstallation: string;
  shouldInstallCustomPipelines?: boolean;
  extension: string;
  dataStream?: RegistryDataStream;
}

export interface RewriteSubstitution {
  source: string;
  target: string;
  templateFunction: string;
}
