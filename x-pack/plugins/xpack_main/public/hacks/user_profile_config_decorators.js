/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';

uiModules.get('kibana')
  .config(($provide, $injector) => {
    if ($injector.has('dashboardConfig')) {
      $provide.decorator('dashboardConfig', function ($delegate, userProfile) {
        return {
          getHideWriteControls() {
            if (!userProfile.canWriteSavedObject('dashboard')) {
              return true;
            }

            return $delegate.getHideWriteControls();
          }
        };
      });
    }

    if ($injector.has('discoverConfig')) {
      $provide.decorator('discoverConfig', function ($delegate, userProfile) {
        return {
          getHideWriteControls() {
            if (!userProfile.canWriteSavedObject('search')) {
              return true;
            }

            return $delegate.getHideWriteControls();
          }
        };
      });
    }

    if ($injector.has('chromeConfig')) {
      $provide.decorator('chromeConfig', function ($delegate, userProfile) {
        return {
          shouldHideNavLink(navLink) {
            if (!userProfile.canAccessFeature(navLink.id)) {
              return true;
            }

            return $delegate.shouldHideNavLink(navLink);
          }
        };
      });
    }
  });
