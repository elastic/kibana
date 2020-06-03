/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { eventLogServiceMock } from './event_log_service.mock';
import { eventLogStartServiceMock } from './event_log_start_service.mock';

export { eventLogClientMock } from './event_log_client.mock';

export { eventLogServiceMock, eventLogStartServiceMock };
export { eventLoggerMock } from './event_logger.mock';

const createSetupMock = () => {
  return eventLogServiceMock.create();
};

const createStartMock = () => {
  return eventLogStartServiceMock.create();
};

export const eventLogMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};
