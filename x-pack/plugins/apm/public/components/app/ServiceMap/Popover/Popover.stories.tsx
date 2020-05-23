/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { ServiceMetricList } from './ServiceMetricList';

storiesOf('app/ServiceMap/Popover/ServiceMetricList', module)
  .add('example', () => (
    <ServiceMetricList
      avgErrorsPerMinute={15.738888706725826}
      avgTransactionDuration={61634.38905590272}
      avgRequestsPerMinute={164.47222031860858}
      avgCpuUsage={0.32809666568309237}
      avgMemoryUsage={0.5504868173242986}
      frameworkName="Spring"
      numInstances={2}
      isLoading={false}
    />
  ))
  .add('loading', () => (
    <ServiceMetricList
      avgErrorsPerMinute={null}
      avgTransactionDuration={null}
      avgRequestsPerMinute={null}
      avgCpuUsage={null}
      avgMemoryUsage={null}
      numInstances={1}
      isLoading={true}
    />
  ))
  .add('some null values', () => (
    <ServiceMetricList
      avgErrorsPerMinute={7.615972134074397}
      avgTransactionDuration={238792.54809512055}
      avgRequestsPerMinute={8.439583235652972}
      avgCpuUsage={null}
      avgMemoryUsage={null}
      numInstances={1}
      isLoading={false}
    />
  ))
  .add('all null values', () => (
    <ServiceMetricList
      avgErrorsPerMinute={null}
      avgTransactionDuration={null}
      avgRequestsPerMinute={null}
      avgCpuUsage={null}
      avgMemoryUsage={null}
      numInstances={1}
      isLoading={false}
    />
  ));
