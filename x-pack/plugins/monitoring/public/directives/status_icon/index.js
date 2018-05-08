/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { uiModules } from 'ui/modules';
import { ElasticsearchStatusIcon } from 'plugins/monitoring/components/elasticsearch/status_icon';
import { NodeStatusIcon } from 'plugins/monitoring/components/elasticsearch/node/status_icon';
import { KibanaStatusIcon } from 'plugins/monitoring/components/kibana/status_icon';

const uiModule = uiModules.get('monitoring/directives', []);

function linkStatusIconComponent(scope, $el, StatusIconComponent) {
  // The watch callback always runs the first time connecting the data to the directive
  // The first time callback runs, unmountComponentAtNode does nothing
  scope.$watch('status', (status) => {
    ReactDOM.unmountComponentAtNode($el[0]);
    ReactDOM.render((
      <div title={scope.title}>
        <StatusIconComponent status={status} />
      </div>
    ), $el[0]);
  });
}

uiModule.directive('monitoringKibanaStatusIcon', function () {
  return {
    restrict: 'E',
    scope: { status: '=' },
    link(scope, $el) {
      linkStatusIconComponent(scope, $el, KibanaStatusIcon);
    }
  };
});

uiModule.directive('monitoringElasticsearchStatusIcon', function () {
  return {
    restrict: 'E',
    scope: { status: '=' },
    link(scope, $el) {
      linkStatusIconComponent(scope, $el, ElasticsearchStatusIcon);
    }
  };
});

uiModule.directive('monitoringElasticsearchNodeStatusIcon', function () {
  return {
    restrict: 'E',
    scope: { status: '=' },
    link(scope, $el) {
      linkStatusIconComponent(scope, $el, NodeStatusIcon);
    }
  };
});
