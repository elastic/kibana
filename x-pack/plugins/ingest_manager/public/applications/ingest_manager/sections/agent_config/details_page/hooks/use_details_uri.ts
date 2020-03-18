/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { generatePath } from 'react-router-dom';
import { useLink } from '../../../../hooks';
import { AGENT_CONFIG_PATH } from '../../../../constants';
import { DETAILS_ROUTER_PATH, DETAILS_ROUTER_SUB_PATH } from '../constants';

export const useDetailsUri = (configId: string) => {
  const BASE_URI = useLink('');
  return useMemo(() => {
    const AGENT_CONFIG_DETAILS = `${BASE_URI}${generatePath(DETAILS_ROUTER_PATH, { configId })}`;

    return {
      ADD_DATASOURCE: `${AGENT_CONFIG_DETAILS}/add-datasource`,
      AGENT_CONFIG_LIST: `${BASE_URI}${AGENT_CONFIG_PATH}`,
      AGENT_CONFIG_DETAILS,
      AGENT_CONFIG_DETAILS_YAML: `${BASE_URI}${generatePath(DETAILS_ROUTER_SUB_PATH, {
        configId,
        tabId: 'yaml',
      })}`,
      AGENT_CONFIG_DETAILS_SETTINGS: `${BASE_URI}${generatePath(DETAILS_ROUTER_SUB_PATH, {
        configId,
        tabId: 'settings',
      })}`,
    };
  }, [BASE_URI, configId]);
};
