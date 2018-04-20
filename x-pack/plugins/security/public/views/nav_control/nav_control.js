/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { constant } from 'lodash';
import { chromeNavControlsRegistry } from 'ui/registry/chrome_nav_controls';
import { uiModules } from 'ui/modules';
import template from 'plugins/security/views/nav_control/nav_control.html';
import 'plugins/security/services/shield_user';
import '../account/account';
import { PathProvider } from 'plugins/xpack_main/services/path';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';

chromeNavControlsRegistry.register(constant({
  name: 'security',
  order: 1000,
  template
}));

const module = uiModules.get('security', ['kibana']);
module.controller('securityNavController', ($scope, ShieldUser, globalNavState, kbnBaseUrl, Private, esDataIsTribe) => {
  const xpackInfo = Private(XPackInfoProvider);
  const showSecurityLinks = xpackInfo.get('features.security.showLinks');
  if (Private(PathProvider).isLoginOrLogout() || !showSecurityLinks) return;

  $scope.user = ShieldUser.getCurrent();
  $scope.route = `${kbnBaseUrl}#/account`;
  $scope.accountDisabled = esDataIsTribe;

  $scope.formatTooltip = (tooltip) => {
    // If the sidebar is open and there's no disabled message,
    // then we don't need to show the tooltip.
    if (globalNavState.isOpen()) {
      return;
    }
    return tooltip;
  };

  $scope.accountTooltip = (name) => {
    if (esDataIsTribe) {
      const tribeTooltip = 'Not available when using a tribe node.';
      return globalNavState.isOpen() ? tribeTooltip : name + ' - ' + tribeTooltip;
    }
    return $scope.formatTooltip(name);
  };

  $scope.onClick = function (event, disabled) {
    if (disabled) {
      event.preventDefault();
    }
  };

});
