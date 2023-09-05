/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TransformCapabilities } from '../common/types/capabilities';

import { extractMissingPrivileges, getPrivilegesAndCapabilities } from './capabilities';

describe('has_privilege_factory', () => {
  const fullClusterPrivileges = {
    'cluster:admin/transform/preview': true,
    'cluster:admin/transform/put': true,
    'cluster:monitor/transform/get': true,
    'cluster:admin/transform/start': true,
    'cluster:admin/transform/delete': true,
    'cluster:admin/transform/reset': true,
    'cluster:admin/transform/stop': true,
    'cluster:admin/transform/start_task': true,
    'cluster:monitor/transform/stats/get': true,
  };

  const monitorOnlyClusterPrivileges = {
    'cluster:admin/transform/preview': false,
    'cluster:admin/transform/put': false,
    'cluster:admin/transform/start': false,
    'cluster:admin/transform/delete': false,
    'cluster:admin/transform/reset': false,
    'cluster:admin/transform/stop': false,
    'cluster:admin/transform/start_task': false,
    'cluster:monitor/transform/get': true,
    'cluster:monitor/transform/stats/get': true,
  };
  const noClusterPrivileges = {
    'cluster:admin/transform/preview': false,
    'cluster:admin/transform/put': false,
    'cluster:admin/transform/start': false,
    'cluster:admin/transform/delete': false,
    'cluster:admin/transform/reset': false,
    'cluster:admin/transform/stop': false,
    'cluster:admin/transform/start_task': false,
    'cluster:monitor/transform/get': false,
    'cluster:monitor/transform/stats/get': false,
  };

  const monitorOnlyMissingPrivileges = Object.entries(monitorOnlyClusterPrivileges)
    .filter(([, authorized]) => !authorized)
    .map(([priv]) => priv);

  describe('extractMissingPrivileges', () => {
    it('returns no missing privilege if provided both monitor and admin cluster privileges', () => {
      expect(extractMissingPrivileges(fullClusterPrivileges)).toEqual([]);
    });
    it('returns missing privilege if provided only monitor cluster privileges', () => {
      expect(extractMissingPrivileges(monitorOnlyClusterPrivileges)).toEqual(
        monitorOnlyMissingPrivileges
      );
    });
    it('returns all missing privilege if provided no cluster privilege', () => {
      const allPrivileges = Object.keys(noClusterPrivileges);
      const extracted = extractMissingPrivileges(noClusterPrivileges);
      expect(extracted).toEqual(allPrivileges);
    });
  });

  describe('getPrivilegesAndCapabilities', () => {
    it('returns full capabilities if provided both monitor and admin cluster privileges', () => {
      const fullCapabilities: TransformCapabilities = {
        canCreateTransform: true,
        canCreateTransformAlerts: true,
        canDeleteIndex: true,
        canDeleteTransform: true,
        canGetTransform: true,
        canPreviewTransform: true,
        canReauthorizeTransform: true,
        canResetTransform: true,
        canScheduleNowTransform: true,
        canStartStopTransform: true,
        canUseTransformAlerts: true,
      };

      expect(getPrivilegesAndCapabilities(fullClusterPrivileges, true, true)).toEqual({
        capabilities: fullCapabilities,
        privileges: { hasAllPrivileges: true, missingPrivileges: { cluster: [], index: [] } },
      });
      expect(getPrivilegesAndCapabilities(fullClusterPrivileges, false, true)).toEqual({
        capabilities: fullCapabilities,
        privileges: {
          hasAllPrivileges: true,
          missingPrivileges: { cluster: [], index: ['monitor'] },
        },
      });
    });
    it('returns view only capabilities if provided only monitor cluster privileges', () => {
      const viewOnlyCapabilities: TransformCapabilities = {
        canCreateTransform: false,
        canCreateTransformAlerts: false,
        canDeleteIndex: false,
        canDeleteTransform: false,
        canGetTransform: true,
        canPreviewTransform: false,
        canReauthorizeTransform: false,
        canResetTransform: false,
        canScheduleNowTransform: false,
        canStartStopTransform: false,
        canUseTransformAlerts: true,
      };

      const { capabilities, privileges } = getPrivilegesAndCapabilities(
        monitorOnlyClusterPrivileges,
        true,
        false
      );
      expect(capabilities).toEqual(viewOnlyCapabilities);
      expect(privileges).toEqual({
        hasAllPrivileges: false,
        missingPrivileges: {
          cluster: monitorOnlyMissingPrivileges,
          index: [],
        },
      });
    });
    it('returns no capabilities and all the missing privileges if no cluster privileges', () => {
      const noCapabilities: TransformCapabilities = {
        canCreateTransform: false,
        canCreateTransformAlerts: false,
        canDeleteIndex: false,
        canDeleteTransform: false,
        canGetTransform: false,
        canPreviewTransform: false,
        canResetTransform: false,
        canReauthorizeTransform: false,
        canScheduleNowTransform: false,
        canStartStopTransform: false,
        canUseTransformAlerts: false,
      };

      const { capabilities, privileges } = getPrivilegesAndCapabilities(
        noClusterPrivileges,
        false,
        false
      );
      expect(capabilities).toEqual(noCapabilities);
      expect(privileges).toEqual({
        hasAllPrivileges: false,
        missingPrivileges: {
          cluster: Object.keys(noClusterPrivileges),
          index: ['monitor'],
        },
      });
    });

    it('returns canResetTransform:false if no cluster privilege for transform/reset', () => {
      const { capabilities } = getPrivilegesAndCapabilities(
        {
          ...fullClusterPrivileges,
          'cluster:admin/transform/reset': false,
        },
        false,
        false
      );
      expect(capabilities.canResetTransform).toEqual(false);
    });
  });
});
