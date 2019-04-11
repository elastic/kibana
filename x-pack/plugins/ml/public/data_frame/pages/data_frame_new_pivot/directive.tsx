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

import { IndexPatternContext } from '../../common';
import { Page } from './page';

module.directive('mlNewDataFrame', ($route: any, Private: any) => {
  return {
    scope: {},
    restrict: 'E',
    link: (scope: ng.IScope, element: ng.IAugmentedJQuery) => {
      const createSearchItems = Private(SearchItemsProvider);
      const { indexPattern } = createSearchItems();

      ReactDOM.render(
        <I18nContext>
          <IndexPatternContext.Provider value={indexPattern}>
            {React.createElement(Page)}
          </IndexPatternContext.Provider>
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
