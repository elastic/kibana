/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { PageContent } from '../../components/page';
import { Waffle } from '../../components/waffle';

import { WithWaffleFilter } from '../../containers/waffle/with_waffle_filters';
import { WithWaffleNodes } from '../../containers/waffle/with_waffle_nodes';
import { WithWaffleOptions } from '../../containers/waffle/with_waffle_options';
import { WithWaffleTime } from '../../containers/waffle/with_waffle_time';
import { WithOptions } from '../../containers/with_options';
import { WithSource } from '../../containers/with_source';

export const HomePageContent: React.SFC = () => (
  <PageContent>
    <WithSource>
      {({ configuredFields }) => (
        <WithOptions>
          {({ wafflemap, sourceId }) => (
            <WithWaffleFilter>
              {({ filterQueryAsJson, applyFilterQuery }) => (
                <WithWaffleTime>
                  {({ currentTimeRange, isAutoReloading }) => (
                    <WithWaffleOptions>
                      {({ metric, groupBy, nodeType }) => (
                        <WithWaffleNodes
                          filterQuery={filterQueryAsJson}
                          metric={metric}
                          groupBy={groupBy}
                          nodeType={nodeType}
                          sourceId={sourceId}
                          timerange={currentTimeRange}
                        >
                          {({ nodes, loading, refetch }) => (
                            <Waffle
                              map={nodes}
                              loading={nodes.length > 0 && isAutoReloading ? false : loading}
                              nodeType={nodeType}
                              options={{ ...wafflemap, metric, fields: configuredFields, groupBy }}
                              reload={refetch}
                              onDrilldown={applyFilterQuery}
                            />
                          )}
                        </WithWaffleNodes>
                      )}
                    </WithWaffleOptions>
                  )}
                </WithWaffleTime>
              )}
            </WithWaffleFilter>
          )}
        </WithOptions>
      )}
    </WithSource>
  </PageContent>
);
