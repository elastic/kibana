/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
} from '@elastic/eui';

import uiChrome from 'ui/chrome';

export function ResultsLinks({ indexPatternId }) {
  return (
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`discoverApp`} />}
          title="View index in Discover"
          description=""
          href={`${uiChrome.getBasePath()}/app/kibana#/discover?&_a=(index:'${indexPatternId}')`}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`machineLearningApp`} />}
          title="Create new ML job"
          description=""
          href={`${uiChrome.getBasePath()}/app/ml#/jobs/new_job/step/job_type?index=${indexPatternId}`}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`dataVisualizer`} />}
          title="Open in Data Visualizer"
          description=""
          href={`${uiChrome.getBasePath()}/app/ml#/jobs/new_job/datavisualizer?index=${indexPatternId}`}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`managementApp`} />}
          title="Index Management"
          description=""
          href={`${uiChrome.getBasePath()}/app/kibana#/management/elasticsearch/index_management/home`}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`managementApp`} />}
          title="Index Pattern Management"
          description=""
          href={`${uiChrome.getBasePath()}/app/kibana#/management/kibana/indices/${indexPatternId}`}
        />
      </EuiFlexItem>



    </EuiFlexGroup>
  );
}
