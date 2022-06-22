/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const HORIZONTAL_LINE = '-'.repeat(80);

export const SUPPORTED_TOKENS = `The following tokens can be used in the Action request 'comment' to drive
  the type of response that is sent:
  Token                         Description
  ---------------------------   -------------------------------------------------------
  RESPOND.STATE=SUCCESS         Will ensure the Endpoint Action response is success
  RESPOND.STATE=FAILURE         Will ensure the Endpoint Action response is a failure
  RESPOND.FLEET.STATE=SUCCESS   Will ensure the Fleet Action response is success
  RESPOND.FLEET.STATE=FAILURE   Will ensure the Fleet Action response is a failure

`;
