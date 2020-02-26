/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { eventLogServiceMock } from './event_log_service.mock';

export { eventLogServiceMock };
export { eventLoggerMock } from './event_logger.mock';

const createSetupMock = () => {
  return eventLogServiceMock.create();
};

const createStartMock = () => {
  return undefined;
};

export const eventLogMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};
