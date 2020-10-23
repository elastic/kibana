/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { EuiThemeProvider } from '../../../../../../../observability/public';
import { MapToolTip } from '../MapToolTip';
import { COUNTRY_NAME, TRANSACTION_DURATION_COUNTRY } from '../useLayerList';

storiesOf('app/RumDashboard/VisitorsRegionMap', module)
  .addDecorator((storyFn) => <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
  .add(
    'Tooltip',
    () => {
      const loadFeatureProps = async () => {
        return [
          {
            getPropertyKey: () => COUNTRY_NAME,
            getRawValue: () => 'United States',
          },
          {
            getPropertyKey: () => TRANSACTION_DURATION_COUNTRY,
            getRawValue: () => 2434353,
          },
        ];
      };
      return (
        <MapToolTip
          loadFeatureProperties={loadFeatureProps as any}
          features={[
            {
              id: 'US',
              layerId: 'e8d1d974-eed8-462f-be2c-f0004b7619b2',
              mbProperties: {
                __kbn__feature_id__: 'US',
                name: 'United States',
                iso2: 'US',
                iso3: 'USA',
                __kbn_isvisibleduetojoin__: true,
                '__kbnjoin__count__3657625d-17b0-41ef-99ba-3a2b2938655c': 439145,
                '__kbnjoin__avg_of_transaction.duration.us__3657625d-17b0-41ef-99ba-3a2b2938655c': 2041665.6350131081,
              },
            },
          ]}
        />
      );
    },
    {
      info: {
        propTables: false,
        source: false,
      },
    }
  );
