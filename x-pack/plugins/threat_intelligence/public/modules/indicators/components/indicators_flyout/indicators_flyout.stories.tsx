/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { generateFieldTypeMap } from '../../../../common/mocks/mock_field_type_map';
import { mockUiSettingsService } from '../../../../common/mocks/mock_kibana_ui_settings_service';
import { mockKibanaTimelinesService } from '../../../../common/mocks/mock_kibana_timelines_service';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { IndicatorsFlyout } from './indicators_flyout';

export default {
  component: IndicatorsFlyout,
  title: 'IndicatorsFlyout',
};

const coreMock = {
  uiSettings: mockUiSettingsService(),
  timelines: mockKibanaTimelinesService,
} as unknown as CoreStart;
const KibanaReactContext = createKibanaReactContext(coreMock);

export const Default: Story<void> = () => {
  const mockIndicator: Indicator = generateMockIndicator();
  const mockFieldTypesMap = generateFieldTypeMap();

  return (
    <KibanaReactContext.Provider>
      <IndicatorsFlyout
        indicator={mockIndicator}
        fieldTypesMap={mockFieldTypesMap}
        closeFlyout={() => window.alert('Closing flyout')}
      />
    </KibanaReactContext.Provider>
  );
};

export const EmptyIndicator: Story<void> = () => {
  return (
    <KibanaReactContext.Provider>
      <IndicatorsFlyout
        indicator={{ fields: {} } as Indicator}
        fieldTypesMap={{}}
        closeFlyout={() => window.alert('Closing flyout')}
      />
    </KibanaReactContext.Provider>
  );
};
