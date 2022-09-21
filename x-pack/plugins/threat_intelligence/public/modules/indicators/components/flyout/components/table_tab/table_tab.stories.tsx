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
import { mockIndicatorsFiltersContext } from '../../../../../../common/mocks/mock_indicators_filters_context';
import { mockUiSettingsService } from '../../../../../../common/mocks/mock_kibana_ui_settings_service';
import { mockKibanaTimelinesService } from '../../../../../../common/mocks/mock_kibana_timelines_service';
import { generateMockIndicator, Indicator } from '../../../../../../types/indicator';
import { IndicatorFlyoutTableTab } from '.';
import { FiltersContext } from '../../../../contexts';

export default {
  component: IndicatorFlyoutTableTab,
  title: 'IndicatorFlyoutTableTab',
};

export const Default: Story<void> = () => {
  const mockIndicator: Indicator = generateMockIndicator();

  const KibanaReactContext = createKibanaReactContext({
    uiSettings: mockUiSettingsService(),
    timelines: mockKibanaTimelinesService,
  } as unknown as CoreStart);

  return (
    <KibanaReactContext.Provider>
      <FiltersContext.Provider value={mockIndicatorsFiltersContext}>
        <IndicatorFlyoutTableTab indicator={mockIndicator} />
      </FiltersContext.Provider>
    </KibanaReactContext.Provider>
  );
};

export const EmptyIndicator: Story<void> = () => {
  return <IndicatorFlyoutTableTab indicator={{ fields: {} } as unknown as Indicator} />;
};
