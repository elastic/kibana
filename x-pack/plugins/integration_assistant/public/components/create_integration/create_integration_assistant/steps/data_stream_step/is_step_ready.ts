/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { State } from '../../state';

export const isDataStreamStepReady = ({ integrationSettings }: State) =>
  Boolean(
    integrationSettings?.name &&
      integrationSettings?.dataStreamTitle &&
      integrationSettings?.dataStreamDescription &&
      integrationSettings?.dataStreamName &&
      integrationSettings?.logsSampleParsed
  );
