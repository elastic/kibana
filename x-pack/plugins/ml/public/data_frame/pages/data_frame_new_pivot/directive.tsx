/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

// @ts-ignore
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { I18nContext } from 'ui/i18n';

// @ts-ignore
import { SearchItemsProvider } from '../../../jobs/new_job/utils/new_job_utils';

import { KibanaContext } from '../../common';
import { Page } from './page';

module.directive('mlNewDataFrame', ($injector: any, $route: any, Private: any) => {
  return {
    scope: {},
    restrict: 'E',
    link: (scope: ng.IScope, element: ng.IAugmentedJQuery) => {
      const createSearchItems = Private(SearchItemsProvider);
      const { indexPattern } = createSearchItems();

      const indexPatterns = $injector.get('indexPatterns');
      const kibanaConfig = $injector.get('config');

      const kibanaContext = {
        currentIndexPattern: indexPattern,
        indexPatterns,
        kibanaConfig,
      };

      ReactDOM.render(
        <I18nContext>
          <KibanaContext.Provider value={kibanaContext}>
            {React.createElement(Page)}
          </KibanaContext.Provider>
        </I18nContext>,
        element[0]
      );

      element.on('$destroy', () => {
        ReactDOM.unmountComponentAtNode(element[0]);
        scope.$destroy();
      });
    },
  };
});
