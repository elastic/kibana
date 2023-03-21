/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { ResponseActionType } from './get_supported_response_actions';
import { getSupportedResponseActions, responseActionTypes } from './get_supported_response_actions';
import { useOsqueryEnabled } from './use_osquery_enabled';

export const useSupportedResponseActionTypes = () => {
  const [supportedResponseActionTypes, setSupportedResponseActionTypes] = useState<
    ResponseActionType[] | undefined
  >();

  const isOsqueryEnabled = useOsqueryEnabled();

  useEffect(() => {
    const supportedTypes = getSupportedResponseActions(responseActionTypes);
    setSupportedResponseActionTypes(supportedTypes);
  }, [isOsqueryEnabled]);

  return supportedResponseActionTypes;
};
