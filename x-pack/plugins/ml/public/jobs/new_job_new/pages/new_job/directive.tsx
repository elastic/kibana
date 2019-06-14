/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

// @ts-ignore
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);
import { timefilter } from 'ui/timefilter';

import { I18nContext } from 'ui/i18n';
import { IndexPattern } from 'ui/index_patterns';
import { IPrivate } from 'ui/private';
import { Field, Aggregation, AggId } from '../../../../../common/types/fields';
// import { ES_FIELD_TYPES } from '../../../../../common/constants/field_types';
import { InjectorService } from '../../../../../common/types/angular';

// @ts-ignore
import { SearchItemsProvider } from '../../../new_job/utils/new_job_utils';
import { /* SingleMetricJobCreator, */ MultiMetricJobCreator } from '../../common/job_creator';
import { ResultsLoader } from '../../common/results_loader';
// import { ChartSettings } from '../../common/chart_settings';
// import { IndexPatternContext } from '../../common';
import { Page } from './page';
import { newJobCapsService } from '../../../../services/new_job_capabilities_service';

// Simple drop-in type until new_job_utils offers types.
type CreateSearchItems = () => {
  indexPattern: IndexPattern;
  savedSearch: any;
  combinedQuery: any;
};

import { KibanaContext } from '../../../../data_frame/common/kibana_context';

module.directive('mlNewJobPage', ($injector: InjectorService) => {
  return {
    scope: {},
    restrict: 'E',
    link: async (scope: ng.IScope, element: ng.IAugmentedJQuery) => {
      timefilter.enableTimeRangeSelector();
      timefilter.disableAutoRefreshSelector();

      const indexPatterns = $injector.get('indexPatterns');
      const kbnBaseUrl = $injector.get<string>('kbnBaseUrl');
      const kibanaConfig = $injector.get('config');
      const Private: IPrivate = $injector.get('Private');

      const createSearchItems: CreateSearchItems = Private(SearchItemsProvider);
      const { indexPattern, savedSearch, combinedQuery } = createSearchItems();

      const kibanaContext = {
        combinedQuery,
        currentIndexPattern: indexPattern,
        currentSavedSearch: savedSearch,
        indexPatterns,
        kbnBaseUrl,
        kibanaConfig,
      };
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
      // const field: Field = {
      //   id: 'NetworkIn',
      //   name: 'NetworkIn',
      //   type: ES_FIELD_TYPES.DOUBLE,
      //   aggregatable: true,
      //   aggIds: [
      //     'mean',
      //     'high_mean',
      //     'low_mean',
      //     'sum',
      //     'high_sum',
      //     'low_sum',
      //     'median',
      //     'high_median',
      //     'low_median',
      //     'min',
      //     'max',
      //     'distinct_count',
      //   ],
      // };

      // const splitField: Field = {
      //   id: 'region',
      //   name: 'region',
      //   type: ES_FIELD_TYPES.KEYWORD,
      //   aggregatable: true,
      //   aggIds: ['distinct_count' as AggId],
      // };

      // const mean = newJobCapsService.aggs[0];
      // const field = newJobCapsService.fields.find(f => f.id === 'NetworkIn') as Field;
      // const splitField = newJobCapsService.fields.find(f => f.id === 'region') as Field;

      // // console.log(newJobCapsService.fields);

      // jobCreator.addDetector(mean, field);
      // jobCreator.setSplitField(splitField);
      // jobCreator.setSplitField(null);
      // jobCreator.bucketSpan = '15m';
      // console.log('bs set 2', jobCreator.bucketSpan);
      // // jobCreator.setDuration(1549497600000, 1549929594001);
      // jobCreator.setTimeRange(1540684800000, 1541943060000);
      // jobCreator.jobId = `new_job-${Date.now()}`;

      // const rl = new ResultsLoader(jobCreator);

      // jobCreator.subscribeToProgress((p: number) => {
      //   // console.log('progress ', p);
      // });
      // jobCreator.subscribeToProgress((progress: number) => {
      //   console.log('prog2 ', progress);
      // });
      // await jobCreator.createAndStartJob();

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
