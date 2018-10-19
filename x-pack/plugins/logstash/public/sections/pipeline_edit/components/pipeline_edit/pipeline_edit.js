/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { isEmpty } from 'lodash';
import { uiModules } from 'ui/modules';
import { Notifier, toastNotifications } from 'ui/notify';
import { PipelineEditor } from '../../../../components/pipeline_editor';
import 'plugins/logstash/services/license';
import 'plugins/logstash/services/security';
import 'ace';

const app = uiModules.get('xpack/logstash');

app.directive('pipelineEdit', function ($injector) {
  const pipelineService = $injector.get('pipelineService');
  const licenseService = $injector.get('logstashLicenseService');
  const securityService = $injector.get('logstashSecurityService');
  const kbnUrl = $injector.get('kbnUrl');
  const shieldUser = $injector.get('ShieldUser');
  const $route = $injector.get('$route');

  return {
    restrict: 'E',
    link: async (scope, el) => {
      const close = () => scope.$evalAsync(kbnUrl.change('/management/logstash/pipelines', {}));
      const open = id =>
        scope.$evalAsync(kbnUrl.change(`/management/logstash/pipelines/${id}/edit`));

      const userResource = securityService.isSecurityEnabled
        ? await shieldUser.getCurrent().$promise
        : null;

      render(
        <PipelineEditor
          kbnUrl={kbnUrl}
          close={close}
          open={open}
          isNewPipeline={isEmpty(scope.pipeline.id)}
          username={userResource ? userResource.username : null}
          pipeline={scope.pipeline}
          pipelineService={pipelineService}
          routeService={$route}
          toastNotifications={toastNotifications}
          licenseService={licenseService}
          notifier={new Notifier({ location: 'Logstash' })}
        />,
        el[0]
      );
    },
    scope: {
      pipeline: '=',
    },
  };
});
