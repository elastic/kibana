/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESPONSE_ACTION_TYPES } from '../../../common/api/detection_engine/model/rule_response_actions';

export const getActionDetails = (actionTypeId: string) => {
  switch (actionTypeId) {
    case RESPONSE_ACTION_TYPES.OSQUERY:
      return { logo: 'logoOsquery', name: 'Osquery' };
    case RESPONSE_ACTION_TYPES.ENDPOINT:
      return { logo: 'logoSecurity', name: 'Endpoint Security' };
    // update when new responseActions are provided
    default:
      return { logo: 'logoOsquery', name: 'Osquery' };
  }
};
