/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { PageContent } from '../../components/page';
import { Waffle } from '../../components/waffle';

import { WithWaffleFilter } from '../../containers/waffle/with_waffle_filters';
import { WithWaffleMetrics } from '../../containers/waffle/with_waffle_metrics';
import { WithWaffleNodes } from '../../containers/waffle/with_waffle_nodes';
import { WithWaffleTime } from '../../containers/waffle/with_waffle_time';
import { WithOptions } from '../../containers/with_options';

export const HomePageContent: React.SFC = () => (
  <PageContent>
    <WithOptions>
      {({ wafflemap, sourceId }) => (
        <WithWaffleFilter>
          {({ filterQueryAsJson }) => (
            <WithWaffleTime>
              {({ currentTimeRange }) => (
                <WithWaffleMetrics>
                  {({ metrics }) => (
                    <WithWaffleNodes
                      filterQuery={filterQueryAsJson}
                      metrics={metrics}
                      path={wafflemap.path}
                      sourceId={sourceId}
                      timerange={currentTimeRange}
                    >
                      {({ nodes, loading, refetch }) => (
                        <Waffle
                          map={nodes}
                          loading={loading}
                          options={wafflemap}
                          reload={refetch}
                        />
                      )}
                    </WithWaffleNodes>
                  )}
                </WithWaffleMetrics>
              )}
            </WithWaffleTime>
          )}
        </WithWaffleFilter>
      )}
    </WithOptions>
  </PageContent>
);
