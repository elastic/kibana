/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { mockTriggersActionsUiService } from '../../../../common/mocks/mock_kibana_triggers_actions_ui_service';
import { mockUiSettingsService } from '../../../../common/mocks/mock_kibana_ui_settings_service';
import { mockKibanaTimelinesService } from '../../../../common/mocks/mock_kibana_timelines_service';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { IndicatorsTable } from './indicators_table';

export default {
  component: IndicatorsTable,
  title: 'IndicatorsTable',
};

const mockIndexPattern: DataView = undefined as unknown as DataView;

const stub = () => void 0;

export function WithIndicators() {
  const indicatorsFixture: Indicator[] = Array(10).fill(generateMockIndicator());

  const KibanaReactContext = createKibanaReactContext({
    uiSettings: mockUiSettingsService(),
    timelines: mockKibanaTimelinesService,
    triggersActionsUi: mockTriggersActionsUiService,
  } as unknown as CoreStart);

  return (
    <KibanaReactContext.Provider>
      <IndicatorsTable
        browserFields={{}}
        loading={false}
        pagination={{
          pageSize: 10,
          pageIndex: 0,
          pageSizeOptions: [10, 25, 50],
        }}
        indicators={indicatorsFixture}
        onChangePage={stub}
        onChangeItemsPerPage={stub}
        indicatorCount={indicatorsFixture.length * 2}
        indexPattern={mockIndexPattern}
      />
    </KibanaReactContext.Provider>
  );
}

export function WithNoIndicators() {
  return (
    <IndicatorsTable
      browserFields={{}}
      pagination={{
        pageSize: 10,
        pageIndex: 0,
        pageSizeOptions: [10, 25, 50],
      }}
      indicators={[]}
      onChangePage={stub}
      onChangeItemsPerPage={stub}
      indicatorCount={0}
      loading={false}
      indexPattern={mockIndexPattern}
    />
  );
}
