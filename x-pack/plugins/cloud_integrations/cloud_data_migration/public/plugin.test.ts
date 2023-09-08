/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { CloudDataMigrationPlugin } from './plugin';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { createBreadcrumbsMock } from './application/services/breadcrumb.mock';

describe('Cloud Data Migration Plugin', () => {
  describe('#setup', () => {
    it('returns expected public contract', () => {
      const coreSetup = coreMock.createSetup();
      const plugin = new CloudDataMigrationPlugin();
      const cloud = cloudMock.createSetup();
      const management = managementPluginMock.createSetupContract();
      const breadcrumbService = createBreadcrumbsMock();
      expect(
        plugin.setup(coreSetup, {
          cloud,
          management,
          breadcrumbService,
        })
      ).toMatchInlineSnapshot(`undefined`);
      expect(management.sections.section.data.registerApp).not.toBeCalled();
    });

    it('returns expected public contract when cloud NOT enabled', () => {
      const coreSetup = coreMock.createSetup();
      const plugin = new CloudDataMigrationPlugin();
      const management = managementPluginMock.createSetupContract();
      const breadcrumbService = createBreadcrumbsMock();
      expect(
        plugin.setup(coreSetup, {
          cloud: { ...cloudMock.createSetup(), isCloudEnabled: false },
          management,
          breadcrumbService,
        })
      ).toMatchInlineSnapshot(`undefined`);
      expect(management.sections.section.data.registerApp).toHaveBeenCalledTimes(1);
      expect(management.sections.section.data.registerApp).toHaveBeenCalledWith({
        id: 'migrate_data',
        mount: expect.any(Function),
        order: 8,
        title: 'Migrate',
      });
    });
  });
});
