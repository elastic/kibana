/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { ACTION_AGENT_FILE_DOWNLOAD_ROUTE } from '../../../../common/endpoint/constants';
import type { ActionDetails, MaybeImmutable } from '../../../../common/endpoint/types';

/**
 * get the download URL for a `get-file` action
 * @param action
 * @param agentId
 */
export const getHostActionFileDownloadUrl = (
  action: MaybeImmutable<ActionDetails>,
  agentId?: string
): string => {
  return resolvePathVariables(ACTION_AGENT_FILE_DOWNLOAD_ROUTE, {
    action_id: action.id,
    agent_id: agentId ?? action.agents[0],
  });
};
