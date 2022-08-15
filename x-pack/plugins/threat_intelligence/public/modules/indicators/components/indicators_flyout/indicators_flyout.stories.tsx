/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { DEFAULT_DATE_FORMAT, DEFAULT_DATE_FORMAT_TZ } from '../../../../../common/constants';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { IndicatorsFlyout } from './indicators_flyout';

export default {
  component: IndicatorsFlyout,
  title: 'IndicatorsFlyout',
};

const mockIndicator: Indicator = generateMockIndicator();
const mockFieldTypesMap: { [id: string]: string } = {
  'threat.indicator.ip': 'ip',
  'threat.indicator.first_seen': 'date',
};

const coreMock = {
  uiSettings: {
    get: (key: string) => {
      const settings = {
        [DEFAULT_DATE_FORMAT]: '',
        [DEFAULT_DATE_FORMAT_TZ]: 'UTC',
      };
      // @ts-expect-error
      return settings[key];
    },
  },
} as unknown as CoreStart;
const KibanaReactContext = createKibanaReactContext(coreMock);

export const Default: Story<void> = () => {
  return (
    <KibanaReactContext.Provider>
      <IndicatorsFlyout
        indicator={mockIndicator}
        fieldTypesMap={mockFieldTypesMap}
        // eslint-disable-next-line no-console
        closeFlyout={() => console.log('closing')}
      />
    </KibanaReactContext.Provider>
  );
};

export const EmtpyIndicator: Story<void> = () => {
  return (
    <KibanaReactContext.Provider>
      <IndicatorsFlyout
        indicator={{ fields: {} } as Indicator}
        fieldTypesMap={{}}
        // eslint-disable-next-line no-console
        closeFlyout={() => console.log('closing')}
      />
    </KibanaReactContext.Provider>
  );
};
