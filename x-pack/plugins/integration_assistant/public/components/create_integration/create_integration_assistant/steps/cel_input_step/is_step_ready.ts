/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { State } from '../../state';

export const isCelInputStepReady = ({ integrationSettings }: State) =>
  Boolean(
    integrationSettings?.name &&
      integrationSettings?.dataStreamTitle &&
      integrationSettings?.dataStreamDescription &&
      integrationSettings?.dataStreamName &&
      integrationSettings?.apiDefinition
  );
// TODO add support for not uploading a spec file
