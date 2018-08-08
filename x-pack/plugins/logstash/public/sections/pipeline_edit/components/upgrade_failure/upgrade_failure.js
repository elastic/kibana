/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { uiModules } from 'ui/modules';
import { InitAfterBindingsWorkaround } from 'ui/compat';
import template from './upgrade_failure.html';

const app = uiModules.get('xpack/logstash');

app.directive('upgradeFailure', function ($injector) {
  const $route = $injector.get('$route');
  const kbnUrl = $injector.get('kbnUrl');

  return {
    restrict: 'E',
    template: template,
    scope: {
      pipeline: '='
    },
    bindToController: true,
    controllerAs: 'upgradeFailure',
    controller: class UpgradeController extends InitAfterBindingsWorkaround {
      initAfterBindings() {
        this.isNewPipeline = isEmpty(this.pipeline.id);
        this.isManualUpgrade = !!$route.current.params.retry;
      }

      onRetry = () => {
        // Reloading the route re-attempts the upgrade
        $route.updateParams({ retry: true });
        $route.reload();
      }

      onClose = () => {
        kbnUrl.change('/management/logstash/pipelines', {});
      }
    }
  };
});
