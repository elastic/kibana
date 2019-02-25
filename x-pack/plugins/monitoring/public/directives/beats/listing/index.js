/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import { I18nContext } from 'ui/i18n';
import { Listing } from '../../../components/beats/listing/listing';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringBeatsListing', (kbnUrl) => {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      sorting: '=',
      pagination: '=paginationSettings',
      onTableChange: '=',
    },
    link(scope, $el) {
      function renderReact(data) {
        render((
          <I18nContext>
            <Listing
              stats={data.stats}
              data={data.listing}
              sorting={scope.sorting}
              pagination={scope.pagination}
              onTableChange={scope.onTableChange}
              angular={{
                kbnUrl,
                scope,
              }}
            />
          </I18nContext>
        ), $el[0]);
      }
      scope.$watch('data', (data = {}) => {
        renderReact(data);
      });
    }
  };
});
