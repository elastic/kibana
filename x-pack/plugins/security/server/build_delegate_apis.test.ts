/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AuditLogger, CoreSecurityDelegateContract } from '@kbn/core-security-server';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-server';

import { auditServiceMock } from './audit/mocks';
import { authenticationServiceMock } from './authentication/authentication_service.mock';
import { buildSecurityApi, buildUserProfileApi } from './build_delegate_apis';
import { securityMock } from './mocks';
import { userProfileServiceMock } from './user_profile/user_profile_service.mock';

describe('buildSecurityApi', () => {
  let authc: ReturnType<typeof authenticationServiceMock.createStart>;
  let auditService: ReturnType<typeof auditServiceMock.create>;
  let api: CoreSecurityDelegateContract;

  beforeEach(() => {
    authc = authenticationServiceMock.createStart();
    auditService = auditServiceMock.create();
    api = buildSecurityApi({ getAuthc: () => authc, audit: auditService });
  });

  describe('authc.getCurrentUser', () => {
    it('properly delegates to the service', () => {
      const request = httpServerMock.createKibanaRequest();
      api.authc.getCurrentUser(request);

      expect(authc.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(authc.getCurrentUser).toHaveBeenCalledWith(request);
    });

    it('returns the result from the service', async () => {
      const request = httpServerMock.createKibanaRequest();
      const delegateReturn = securityMock.createMockAuthenticatedUser();

      authc.getCurrentUser.mockReturnValue(delegateReturn);

      const currentUser = api.authc.getCurrentUser(request);

      expect(currentUser).toBe(delegateReturn);
    });
  });

  describe('audit.asScoped', () => {
    let auditLogger: AuditLogger;
    it('properly delegates to the service', () => {
      const request = httpServerMock.createKibanaRequest();
      auditLogger = api.audit.asScoped(request);
      auditLogger.log({ message: 'an event' });
      expect(auditService.asScoped).toHaveBeenCalledTimes(1);
      expect(auditService.asScoped).toHaveBeenCalledWith(request);
    });

    it('returns the result from the service', async () => {
      const request = httpServerMock.createKibanaRequest();
      auditLogger = api.audit.asScoped(request);
      auditLogger.log({ message: 'an event' });
      expect(auditService.asScoped(request).log).toHaveBeenCalledTimes(1);
      expect(auditService.asScoped(request).log).toHaveBeenCalledWith({ message: 'an event' });
    });
  });
});

describe('buildUserProfileApi', () => {
  let userProfile: ReturnType<typeof userProfileServiceMock.createStart>;
  let api: CoreUserProfileDelegateContract;

  beforeEach(() => {
    userProfile = userProfileServiceMock.createStart();
    api = buildUserProfileApi({ getUserProfile: () => userProfile });
  });

  describe('getCurrent', () => {
    it('properly delegates to the service', async () => {
      const request = httpServerMock.createKibanaRequest();
      await api.getCurrent({ request, dataPath: 'dataPath' });

      expect(userProfile.getCurrent).toHaveBeenCalledTimes(1);
      expect(userProfile.getCurrent).toHaveBeenCalledWith({ request, dataPath: 'dataPath' });
    });

    it('returns the result from the service', async () => {
      const request = httpServerMock.createKibanaRequest();

      userProfile.getCurrent.mockResolvedValue(null);

      const returnValue = await api.getCurrent({ request, dataPath: 'dataPath' });

      expect(returnValue).toBe(null);
    });
  });

  describe('bulkGet', () => {
    it('properly delegates to the service', async () => {
      const uids = new Set(['foo', 'bar']);
      await api.bulkGet({ uids, dataPath: 'dataPath' });

      expect(userProfile.bulkGet).toHaveBeenCalledTimes(1);
      expect(userProfile.bulkGet).toHaveBeenCalledWith({ uids, dataPath: 'dataPath' });
    });

    it('returns the result from the service', async () => {
      userProfile.bulkGet.mockResolvedValue([]);

      const returnValue = await api.bulkGet({ uids: new Set(), dataPath: 'dataPath' });

      expect(returnValue).toEqual([]);
    });
  });

  describe('suggest', () => {
    it('properly delegates to the service', async () => {
      await api.suggest({ name: 'foo' });

      expect(userProfile.suggest).toHaveBeenCalledTimes(1);
      expect(userProfile.suggest).toHaveBeenCalledWith({ name: 'foo' });
    });

    it('returns the result from the service', async () => {
      userProfile.suggest.mockResolvedValue([]);

      const returnValue = await api.suggest({ name: 'foo' });

      expect(returnValue).toEqual([]);
    });
  });

  describe('update', () => {
    it('properly delegates to the service', async () => {
      const updated = { foo: 'bar' };
      await api.update('foo', updated);

      expect(userProfile.update).toHaveBeenCalledTimes(1);
      expect(userProfile.update).toHaveBeenCalledWith('foo', updated);
    });
  });
});
