/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../services';

import type { FleetRequestHandler } from '../../types';

export const getUninstallTokensHandler: FleetRequestHandler = async (
  context,
  request,
  response
) => {
  const uninstallTokenService = appContextService.getUninstallTokenService();
  if (!uninstallTokenService) {
    return response.customError({
      statusCode: 500,
      body: { message: 'Uninstall Token Service is unavailable.' },
    });
  }

  try {
    const items = await uninstallTokenService.getAllTokens();

    return response.ok({
      body: {
        items,
        total: Object.keys(items).length,
      },
    });
  } catch {
    return response.customError({
      statusCode: 500,
      body: { message: 'Failed to get uninstall tokens.' },
    });
  }
};
