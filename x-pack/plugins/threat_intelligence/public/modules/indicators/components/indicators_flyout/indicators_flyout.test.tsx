/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IndicatorsFlyout, SUBTITLE_TEST_ID, TITLE_TEST_ID } from './indicators_flyout';
import { generateMockIndicator, RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { dateFormatter } from '../../../../common/utils/dates';
import { mockUiSetting } from '../../../../common/mocks/mock_kibana_ui_settings_service';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';
import { generateFieldTypeMap } from '../../../../common/mocks/mock_field_type_map';
import { unwrapValue } from '../../lib/unwrap_value';

const mockIndicator = generateMockIndicator();
const mockFieldTypesMap = generateFieldTypeMap();

describe('<IndicatorsFlyout />', () => {
  it('should render ioc id in title and first_seen in subtitle', () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsFlyout
          indicator={mockIndicator}
          fieldTypesMap={mockFieldTypesMap}
          closeFlyout={() => {}}
        />
      </TestProvidersComponent>
    );

    expect(getByTestId(TITLE_TEST_ID).innerHTML).toContain(
      `Indicator: ${unwrapValue(mockIndicator, RawIndicatorFieldId.Name)}`
    );
    expect(getByTestId(SUBTITLE_TEST_ID).innerHTML).toContain(
      `First seen: ${dateFormatter(
        unwrapValue(mockIndicator, RawIndicatorFieldId.FirstSeen) as string,
        mockUiSetting('dateFormat:tz') as string,
        mockUiSetting('dateFormat') as string
      )}`
    );
  });

  it(`should render ${EMPTY_VALUE} in on invalid indicator first_seen value`, () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsFlyout indicator={{ fields: {} }} fieldTypesMap={{}} closeFlyout={() => {}} />
      </TestProvidersComponent>
    );

    expect(getByTestId(TITLE_TEST_ID).innerHTML).toContain(`Indicator: ${EMPTY_VALUE}`);
    expect(getByTestId(SUBTITLE_TEST_ID).innerHTML).toContain(`First seen: ${EMPTY_VALUE}`);
  });

  it(`should render ${EMPTY_VALUE} in title and subtitle on invalid indicator`, () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsFlyout
          indicator={{ fields: { 'threat.indicator.first_seen': ['abc'] } }}
          fieldTypesMap={mockFieldTypesMap}
          closeFlyout={() => {}}
        />
      </TestProvidersComponent>
    );

    expect(getByTestId(TITLE_TEST_ID).innerHTML).toContain(`Indicator: ${EMPTY_VALUE}`);
    expect(getByTestId(SUBTITLE_TEST_ID).innerHTML).toContain(`First seen: ${EMPTY_VALUE}`);
  });
});
