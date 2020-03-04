/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { euiPaletteColorBlind } from '@elastic/eui';
import { WithWaffleOptions } from '../../../containers/waffle/with_waffle_options';
import { WithSource } from '../../../containers/with_source';
import { Layout } from '../../../components/inventory/layout';
import { InfraWaffleMapLegendMode, InfraFormatterType } from '../../../lib/lib';

const euiVisColorPalette = euiPaletteColorBlind();

export const SnapshotPageContent: React.FC = () => (
  <WithSource>
    {({ configuration, sourceId }) => (
      <WithWaffleOptions>
        {({
          metric,
          groupBy,
          nodeType,
          view,
          changeView,
          autoBounds,
          boundsOverride,
          accountId,
          region,
        }) => (
          <Layout
            metric={metric}
            groupBy={groupBy}
            nodeType={nodeType}
            sourceId={sourceId}
            options={{
              formatter: InfraFormatterType.percent,
              formatTemplate: '{{value}}',
              legend: {
                type: InfraWaffleMapLegendMode.gradient,
                rules: [
                  { value: 0, color: '#D3DAE6' },
                  { value: 1, color: euiVisColorPalette[1] },
                ],
              },
              metric,
              fields: configuration && configuration.fields,
              groupBy,
            }}
            view={view}
            onViewChange={changeView}
            autoBounds={autoBounds}
            boundsOverride={boundsOverride}
            accountId={accountId}
            region={region}
          />
        )}
      </WithWaffleOptions>
    )}
  </WithSource>
);
