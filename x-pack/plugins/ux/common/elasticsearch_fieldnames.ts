/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SERVICE = 'service';
export const SERVICE_NAME = 'service.name';
export const SERVICE_ENVIRONMENT = 'service.environment';

export const AGENT = 'agent';
export const AGENT_NAME = 'agent.name';
export const AGENT_VERSION = 'agent.version';

export const URL_FULL = 'url.full';
export const USER_AGENT_NAME = 'user_agent.name';

export const TRANSACTION_DURATION = 'transaction.duration.us';
export const TRANSACTION_TYPE = 'transaction.type';
export const TRANSACTION_RESULT = 'transaction.result';
export const TRANSACTION_NAME = 'transaction.name';
export const TRANSACTION_ID = 'transaction.id';

export const CLIENT_GEO_COUNTRY_ISO_CODE = 'client.geo.country_iso_code';

// RUM Labels
export const TRANSACTION_URL = 'url.full';
export const CLIENT_GEO = 'client.geo';
export const USER_AGENT_DEVICE = 'user_agent.device.name';
export const USER_AGENT_OS = 'user_agent.os.name';

export const TRANSACTION_TIME_TO_FIRST_BYTE =
  'transaction.marks.agent.timeToFirstByte';
export const TRANSACTION_DOM_INTERACTIVE =
  'transaction.marks.agent.domInteractive';

export const FCP_FIELD = 'transaction.marks.agent.firstContentfulPaint';
export const LCP_FIELD = 'transaction.marks.agent.largestContentfulPaint';
export const TBT_FIELD = 'transaction.experience.tbt';
export const FID_FIELD = 'transaction.experience.fid';
export const CLS_FIELD = 'transaction.experience.cls';
