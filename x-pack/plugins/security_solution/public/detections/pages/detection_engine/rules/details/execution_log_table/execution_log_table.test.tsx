/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { noop } from 'lodash/fp';

import { useSourcererDataView } from '../../../../../../common/containers/sourcerer';
import { ExecutionLogTable } from './execution_log_table';

jest.mock('../../../../../containers/detection_engine/rules', () => {
  const original = jest.requireActual('../../../../../containers/detection_engine/rules');
  return {
    ...original,
    useRuleExecutionEvents: jest.fn().mockReturnValue({
      loading: true,
      setQuery: () => undefined,
      data: null,
      response: '',
      request: '',
      refetch: null,
    }),
  };
});

jest.mock('../../../../../../common/containers/sourcerer');

jest.mock('../../../../../../common/hooks/use_app_toasts', () => {
  const original = jest.requireActual('../../../../../../common/hooks/use_app_toasts');

  return {
    ...original,
    useAppToasts: () => ({
      addSuccess: jest.fn(),
      addError: jest.fn(),
    }),
  };
});

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => jest.fn(),
    useSelector: () => jest.fn(),
  };
});

jest.mock('../../../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../../../common/lib/kibana');

  return {
    ...original,
    useUiSetting$: jest.fn().mockReturnValue([]),
    useKibana: () => ({
      services: {
        data: {
          query: {
            filterManager: jest.fn().mockReturnValue({}),
          },
        },
        docLinks: {
          links: {
            siem: {
              troubleshootGaps: 'link',
            },
          },
        },
        storage: {
          get: jest.fn(),
          set: jest.fn(),
        },
        timelines: {
          getLastUpdated: jest.fn(),
          getFieldBrowser: jest.fn(),
        },
      },
    }),
  };
});

const mockUseSourcererDataView = useSourcererDataView as jest.Mock;
mockUseSourcererDataView.mockReturnValue({
  indexPattern: { fields: [] },
  missingPatterns: {},
  selectedPatterns: {},
  scopeSelectedPatterns: {},
  loading: false,
});

// TODO: Replace snapshot test with base test cases

describe('ExecutionLogTable', () => {
  describe('snapshots', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(<ExecutionLogTable ruleId={'0'} selectAlertsTab={noop} />);
      expect(wrapper).toMatchSnapshot();
    });
  });
});
