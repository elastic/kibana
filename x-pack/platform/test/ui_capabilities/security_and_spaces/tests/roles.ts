/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import {
  GlobalAll as GlobalAllUser,
  Superuser,
  ReadSecurity as ReadSecurityRoleUser,
  ManageSecurity as ManageSecurityRoleUser,
} from '../scenarios';

export default function fooTests({ getService }: FtrProviderContext) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('role management', () => {
    it('Superuser role capabilities should have all role capabilities set to true', async () => {
      const uiCapabilities = await uiCapabilitiesService.get({
        credentials: { username: Superuser.username, password: Superuser.password },
      });

      expect(uiCapabilities.value!.roles).to.eql({
        view: true,
        save: true,
      });
    });

    it('User without cluster privilages should have all role capabilities set to false', async () => {
      const uiCapabilities = await uiCapabilitiesService.get({
        credentials: { username: GlobalAllUser.username, password: GlobalAllUser.password },
      });

      expect(uiCapabilities.value!.roles).to.eql({
        view: false,
        save: false,
      });
    });

    it('user with read_security cluster privilege should have view role capabilities set to true', async () => {
      const uiCapabilities = await uiCapabilitiesService.get({
        credentials: {
          username: ReadSecurityRoleUser.username,
          password: ReadSecurityRoleUser.password,
        },
      });

      expect(uiCapabilities.value!.roles).to.eql({
        view: true,
        save: false,
      });
    });

    it('user with manage_security cluster privilege should have view/save role capabilities set to true', async () => {
      const uiCapabilities = await uiCapabilitiesService.get({
        credentials: {
          username: ManageSecurityRoleUser.username,
          password: ManageSecurityRoleUser.password,
        },
      });

      expect(uiCapabilities.value!.roles).to.eql({
        view: true,
        save: true,
      });
    });
  });
}
