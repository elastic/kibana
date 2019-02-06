/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { isEmpty } from 'lodash';
import { uiModules } from 'ui/modules';
import { I18nContext } from 'ui/i18n';
import { UpgradeFailure } from '../../../../components/upgrade_failure';

const app = uiModules.get('xpack/logstash');

app.directive('upgradeFailure', $injector => {
  const $route = $injector.get('$route');
  const kbnUrl = $injector.get('kbnUrl');

  return {
    link: (scope, el) => {
      const onRetry = () => {
        $route.updateParams({ retry: true });
        $route.reload();
      };
      const onClose = () => {
        scope.$evalAsync(kbnUrl.change('management/logstash/pipelines', {}));
      };
      const isNewPipeline = isEmpty(scope.pipeline.id);
      const isManualUpgrade = !!$route.current.params.retry;

      render(
        <I18nContext>
          <UpgradeFailure
            isNewPipeline={isNewPipeline}
            isManualUpgrade={isManualUpgrade}
            onRetry={onRetry}
            onClose={onClose}
          />
        </I18nContext>,
        el[0]
      );
    },
    restrict: 'E',
    scope: {
      pipeline: '=',
    },
  };
});
