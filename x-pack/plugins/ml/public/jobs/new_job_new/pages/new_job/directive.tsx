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
import { timefilter } from 'ui/timefilter';

import { I18nContext } from 'ui/i18n';
import { Field, Aggregation } from '../../../../../common/types/fields';
import { ES_FIELD_TYPES } from '../../../../../common/constants/field_types';

// @ts-ignore
import { SearchItemsProvider } from '../../../new_job/utils/new_job_utils';
import { /* SingleMetricJobCreator, */ MultiMetricJobCreator } from '../../common/job_creator';
// import { ChartSettings } from '../../common/chart_settings';
import { IndexPatternContext } from '../../common';
import { Page } from './page';

module.directive('mlNewJobPage', ($route: any, Private: any) => {
  return {
    scope: {},
    restrict: 'E',
    link: async (scope: ng.IScope, element: ng.IAugmentedJQuery) => {
      timefilter.enableTimeRangeSelector();
      timefilter.disableAutoRefreshSelector();
      const createSearchItems = Private(SearchItemsProvider);
      const { indexPattern, savedSearch, combinedQuery } = createSearchItems();
      // const chartSettings = new ChartSettings();
      const jobCreator = new MultiMetricJobCreator(
        indexPattern,
        savedSearch,
        combinedQuery
        // chartSettings
      );
      // debugger;
      // const responseTime: Field = {
      //   id: 'responsetime',
      //   name: 'responsetime',
      //   type: ES_FIELD_TYPES.FLOAT,
      //   aggregatable: true,
      // };
      const field: Field = {
        id: 'NetworkIn',
        name: 'NetworkIn',
        type: ES_FIELD_TYPES.DOUBLE,
        aggregatable: true,
        aggIds: [
          'mean',
          'high_mean',
          'low_mean',
          'sum',
          'high_sum',
          'low_sum',
          'median',
          'high_median',
          'low_median',
          'min',
          'max',
          'distinct_count',
        ],
      };

      const splitField: Field = {
        id: 'region',
        name: 'region',
        type: ES_FIELD_TYPES.KEYWORD,
        aggregatable: true,
        aggIds: ['distinct_count'],
      };

      const mean: Aggregation = {
        id: 'mean',
        title: 'Mean',
        kibanaName: 'avg',
        dslName: 'avg',
        type: 'metrics',
        mlModelPlotAgg: {
          max: 'avg',
          min: 'avg',
        },
      };

      jobCreator.addDetector(mean, field);
      jobCreator.setSplitField(splitField);
      // jobCreator.setSplitField(null);
      jobCreator.bucketSpan = '15m';
      // jobCreator.setDuration(1549497600000, 1549929594001);
      jobCreator.setDuration(1540684800000, 1541943060000);
      jobCreator.jobId = `new_job-${Date.now()}`;

      jobCreator.subscribeToProgress((p: number) => {
        // console.log('progress ', p);
      });
      // jobCreator.subscribeToProgress((progress: number) => {
      //   console.log('prog2 ', progress);
      // });
      await jobCreator.createAndStartJob();

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
