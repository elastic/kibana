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
      avgCpuUsage={0.32809666568309237}
      avgErrorRate={0.556068173242986}
      avgMemoryUsage={0.5504868173242986}
      avgRequestsPerMinute={164.47222031860858}
      avgTransactionDuration={61634.38905590272}
      isLoading={false}
    />
  ))
  .add('loading', () => (
    <ServiceMetricList
      avgCpuUsage={null}
      avgErrorRate={null}
      avgMemoryUsage={null}
      avgRequestsPerMinute={null}
      avgTransactionDuration={null}
      isLoading={true}
    />
  ))
  .add('some null values', () => (
    <ServiceMetricList
      avgCpuUsage={null}
      avgErrorRate={0.615972134074397}
      avgMemoryUsage={null}
      avgRequestsPerMinute={8.439583235652972}
      avgTransactionDuration={238792.54809512055}
      isLoading={false}
    />
  ))
  .add('all null values', () => (
    <ServiceMetricList
      avgCpuUsage={null}
      avgErrorRate={null}
      avgMemoryUsage={null}
      avgRequestsPerMinute={null}
      avgTransactionDuration={null}
      isLoading={false}
    />
  ));
