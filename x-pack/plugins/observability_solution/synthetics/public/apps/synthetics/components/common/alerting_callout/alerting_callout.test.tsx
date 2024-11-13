/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactRedux from 'react-redux';
import { waitFor } from '@testing-library/react';
import { render } from '../../../utils/testing/rtl_helpers';
import {
  AlertingCallout,
  MISSING_DEFAULT_CONNECTOR_LABEL,
  MISSING_MONITOR_STATUS_CONTENT,
  MISSING_MONITOR_STATUS_HEADER,
  MISSING_TLS_RULE_CONTENT,
  MISSING_TLS_RULE_HEADER,
} from './alerting_callout';
import { selectSyntheticsRules } from '../../../state/alert_rules/selectors';
import { selectDynamicSettings } from '../../../state/settings';
import { selectMonitorListState } from '../../../state';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { SYNTHETICS_STATUS_RULE, SYNTHETICS_TLS_RULE } from '@kbn/rule-data-utils';
import * as contextHelpers from '../../../contexts';

jest.mock('../../../contexts', () => ({
  ...jest.requireActual('../../../contexts'),
  useSyntheticsSettingsContext: jest.fn().mockReturnValue({
    canSave: true,
  }),
  useSyntheticsStartPlugins: jest.fn().mockReturnValue({
    share: {
      url: {
        locators: {
          get: jest.fn().mockReturnValue({
            getUrl: jest.fn().mockResolvedValue('url'),
          }),
        },
      },
    },
  }),
}));

function injectReduxState(syntheticsRules?: any, dynamicSettings?: any, monitorList?: any) {
  jest.spyOn(reactRedux, 'useSelector').mockImplementation((selector) => {
    if (selector === selectSyntheticsRules) {
      return syntheticsRules;
    } else if (selector === selectDynamicSettings) {
      return dynamicSettings;
    } else if (selector === selectMonitorListState) {
      return monitorList;
    }
  });
}

describe('AlertingCallout', () => {
  afterEach(() => jest.clearAllMocks());
  it('renders null when `activeRules` is undefined', () => {
    injectReduxState(undefined, { settings: {} }, { data: { monitors: [] }, loaded: true });
    const { container } = render(<AlertingCallout />);
    expect(container).toBeEmptyDOMElement();
  });
  it.each([
    [
      // rules
      [{ rule_type_id: SYNTHETICS_STATUS_RULE, enabled: true }],
      // monitors
      [
        {
          [ConfigKey.ALERT_CONFIG]: { status: { enabled: true } },
          [ConfigKey.MONITOR_TYPE]: 'http',
          [ConfigKey.ENABLED]: true,
        },
      ],
      // expected messages
      [MISSING_DEFAULT_CONNECTOR_LABEL, MISSING_TLS_RULE_CONTENT, MISSING_TLS_RULE_HEADER],
    ],
    [
      // rules
      [{ rule_type_id: SYNTHETICS_TLS_RULE, enabled: true }],
      // monitors
      [
        {
          [ConfigKey.ALERT_CONFIG]: { status: { enabled: true } },
          [ConfigKey.MONITOR_TYPE]: 'http',
          [ConfigKey.ENABLED]: true,
        },
      ],
      // expected messages
      [
        MISSING_DEFAULT_CONNECTOR_LABEL,
        MISSING_MONITOR_STATUS_CONTENT,
        MISSING_MONITOR_STATUS_HEADER,
      ],
    ],
  ])('renders correctly', async (rules, monitors, expectedContent) => {
    jest
      .spyOn(contextHelpers, 'useSyntheticsSettingsContext')
      // casting to any because we aren't testing the rest of these fields
      .mockReturnValue({ canSave: true } as any);
    injectReduxState(
      rules,
      { settings: {} },
      {
        data: { monitors },
        loaded: true,
      }
    );
    const { getByText } = render(<AlertingCallout />);

    await waitFor(() => {
      expectedContent.forEach((content) => {
        expect(getByText(content)).toBeInTheDocument();
      });
    });
  });

  it.each([true, false])(
    '`isAlertingEnabled` impacts whether callouts are rendered',
    async (isAlertingEnabled) => {
      injectReduxState(
        [],
        { settings: {} },
        {
          data: {
            monitors: [
              {
                [ConfigKey.ALERT_CONFIG]: { status: { enabled: true } },
                [ConfigKey.MONITOR_TYPE]: 'http',
                [ConfigKey.ENABLED]: true,
              },
            ],
          },
        }
      );
      const { container, getByText } = render(
        <AlertingCallout isAlertingEnabled={isAlertingEnabled} />
      );

      const calloutContent = [
        MISSING_MONITOR_STATUS_CONTENT,
        MISSING_MONITOR_STATUS_HEADER,
        MISSING_TLS_RULE_CONTENT,
        MISSING_TLS_RULE_HEADER,
      ];

      if (!isAlertingEnabled) {
        expect(container.firstChild).toBeNull();
      } else {
        await waitFor(() => {
          if (isAlertingEnabled) {
            calloutContent.forEach((content) => expect(getByText(content)).toBeInTheDocument());
          }
        });
      }
    }
  );
});
