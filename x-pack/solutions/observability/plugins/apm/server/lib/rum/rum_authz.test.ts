/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { assertDeploymentWideRumWrite } from './rum_authz';

const authzWith = ({ rbac, hasAllRequested }: { rbac: boolean; hasAllRequested: boolean }) => {
  const globally = jest.fn().mockResolvedValue({ hasAllRequested });
  const authz = {
    mode: { useRbacForRequest: () => rbac },
    actions: { api: { get: (operation: string) => `api:${operation}` } },
    checkPrivilegesWithRequest: jest.fn(() => ({ globally })),
  } as unknown as SecurityPluginStart['authz'];
  return { authz, globally };
};

describe('assertDeploymentWideRumWrite', () => {
  const request = httpServerMock.createKibanaRequest();

  it('allows users with APM settings write access in all spaces', async () => {
    const { authz, globally } = authzWith({ rbac: true, hasAllRequested: true });

    await expect(assertDeploymentWideRumWrite(authz, request)).resolves.toBeUndefined();
    expect(authz.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
    expect(globally).toHaveBeenCalledWith({ kibana: ['api:apm', 'api:apm_settings_write'] });
  });

  it('rejects users without APM settings write access in every space', async () => {
    const { authz } = authzWith({ rbac: true, hasAllRequested: false });

    await expect(assertDeploymentWideRumWrite(authz, request)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
  });

  it('skips the check when RBAC does not apply', async () => {
    const { authz, globally } = authzWith({ rbac: false, hasAllRequested: false });

    await expect(assertDeploymentWideRumWrite(authz, request)).resolves.toBeUndefined();
    await expect(assertDeploymentWideRumWrite(undefined, request)).resolves.toBeUndefined();
    expect(globally).not.toHaveBeenCalled();
  });
});
