/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * angularjs wrapper directive for the AnnotationsTable React component.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { AnnotationFlyout } from './index';
import { ml } from 'plugins/ml/services/ml_api_service';

import 'angular';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { I18nProvider } from '@kbn/i18n/react';

module.directive('mlAnnotationFlyout', function () {

  function link(scope, element) {
    function renderReactComponent() {
      const props = {
        annotations: scope.annotations,
        mlAnnotations: ml.annotations,
      };

      ReactDOM.render(
        <I18nProvider>
          {React.createElement(AnnotationFlyout, props)}
        </I18nProvider>,
        element[0]
      );
    }

    renderReactComponent();

    scope.$on('render', () => {
      renderReactComponent();
    });

    function renderFocusChart() {
      renderReactComponent();
    }

    scope.$watchCollection('annotations', renderFocusChart);

    element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode(element[0]);
      scope.$destroy();
    });

  }

  return {
    scope: false,
    link: link
  };
});
