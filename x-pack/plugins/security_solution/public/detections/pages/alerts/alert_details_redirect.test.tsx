/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { AlertDetailsRedirect } from './alert_details_redirect';
import { TestProviders } from '../../../common/mock';
import { ALERTS_PATH, ALERT_DETAILS_REDIRECT_PATH } from '../../../../common/constants';
import { mockHistory } from '../../../common/utils/route/mocks';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

jest.mock('../../../common/hooks/use_experimental_features');

jest.mock('../../../common/lib/kibana');

const testAlertId = 'test-alert-id';
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    alertId: testAlertId,
  }),
}));

const testIndex = '.someTestIndex';
const testTimestamp = '2023-04-20T12:00:00.000Z';
const mockPathname = `${ALERT_DETAILS_REDIRECT_PATH}/${testAlertId}`;

describe('AlertDetailsRedirect', () => {
  afterEach(() => {
    mockHistory.replace.mockClear();
  });

  describe('with index and timestamp query parameters set', () => {
    it('redirects to the expected path with the correct query parameters', () => {
      const testSearch = `?index=${testIndex}&timestamp=${testTimestamp}`;
      const historyMock = {
        ...mockHistory,
        location: {
          hash: '',
          pathname: mockPathname,
          search: testSearch,
          state: '',
        },
      };
      render(
        <TestProviders>
          <Router history={historyMock}>
            <AlertDetailsRedirect />
          </Router>
        </TestProviders>
      );

      expect(historyMock.replace).toHaveBeenCalledWith({
        hash: '',
        pathname: ALERTS_PATH,
        search: `?query=%28language%3Akuery%2Cquery%3A%27_id%3A+test-alert-id%27%29&timerange=%28global%3A%28linkTo%3A%21%28timeline%2CsocTrends%29%2Ctimerange%3A%28from%3A%272023-04-20T12%3A00%3A00.000Z%27%2Ckind%3Aabsolute%2Cto%3A%272023-04-20T12%3A05%3A00.000Z%27%29%29%2Ctimeline%3A%28linkTo%3A%21%28global%2CsocTrends%29%2Ctimerange%3A%28from%3A%272020-07-07T08%3A20%3A18.966Z%27%2CfromStr%3Anow%2Fd%2Ckind%3Arelative%2Cto%3A%272020-07-08T08%3A20%3A18.966Z%27%2CtoStr%3Anow%2Fd%29%29%29&pageFilters=%21%28%28exclude%3A%21f%2CexistsSelected%3A%21f%2CfieldName%3Akibana.alert.workflow_status%2CselectedOptions%3A%21%28%29%2Ctitle%3AStatus%29%29&flyout=%28panelView%3AeventDetail%2Cparams%3A%28eventId%3Atest-alert-id%2CindexName%3A.someTestIndex%29%29`,
        state: undefined,
      });
    });
  });

  describe('with only index query parameter set', () => {
    it('redirects to the expected path with the default global timestamp settings', () => {
      const testSearch = `?index=${testIndex}`;
      const historyMock = {
        ...mockHistory,
        location: {
          hash: '',
          pathname: mockPathname,
          search: testSearch,
          state: '',
        },
      };
      render(
        <TestProviders>
          <Router history={historyMock}>
            <AlertDetailsRedirect />
          </Router>
        </TestProviders>
      );

      expect(historyMock.replace).toHaveBeenCalledWith({
        hash: '',
        pathname: ALERTS_PATH,
        search: `?query=%28language%3Akuery%2Cquery%3A%27_id%3A+test-alert-id%27%29&timerange=%28global%3A%28linkTo%3A%21%28timeline%2CsocTrends%29%2Ctimerange%3A%28from%3A%272020-07-07T08%3A20%3A18.966Z%27%2Ckind%3Aabsolute%2Cto%3A%272020-07-08T08%3A25%3A18.966Z%27%29%29%2Ctimeline%3A%28linkTo%3A%21%28global%2CsocTrends%29%2Ctimerange%3A%28from%3A%272020-07-07T08%3A20%3A18.966Z%27%2CfromStr%3Anow%2Fd%2Ckind%3Arelative%2Cto%3A%272020-07-08T08%3A20%3A18.966Z%27%2CtoStr%3Anow%2Fd%29%29%29&pageFilters=%21%28%28exclude%3A%21f%2CexistsSelected%3A%21f%2CfieldName%3Akibana.alert.workflow_status%2CselectedOptions%3A%21%28%29%2Ctitle%3AStatus%29%29&flyout=%28panelView%3AeventDetail%2Cparams%3A%28eventId%3Atest-alert-id%2CindexName%3A.someTestIndex%29%29`,
        state: undefined,
      });
    });
  });

  describe('with no query parameters set', () => {
    it('redirects to the expected path with the proper default alerts index and default global timestamp setting', () => {
      const historyMock = {
        ...mockHistory,
        location: {
          hash: '',
          pathname: mockPathname,
          search: '',
          state: '',
        },
      };
      render(
        <TestProviders>
          <Router history={historyMock}>
            <AlertDetailsRedirect />
          </Router>
        </TestProviders>
      );

      expect(historyMock.replace).toHaveBeenCalledWith({
        hash: '',
        pathname: ALERTS_PATH,
        search: `?query=%28language%3Akuery%2Cquery%3A%27_id%3A+test-alert-id%27%29&timerange=%28global%3A%28linkTo%3A%21%28timeline%2CsocTrends%29%2Ctimerange%3A%28from%3A%272020-07-07T08%3A20%3A18.966Z%27%2Ckind%3Aabsolute%2Cto%3A%272020-07-08T08%3A25%3A18.966Z%27%29%29%2Ctimeline%3A%28linkTo%3A%21%28global%2CsocTrends%29%2Ctimerange%3A%28from%3A%272020-07-07T08%3A20%3A18.966Z%27%2CfromStr%3Anow%2Fd%2Ckind%3Arelative%2Cto%3A%272020-07-08T08%3A20%3A18.966Z%27%2CtoStr%3Anow%2Fd%29%29%29&pageFilters=%21%28%28exclude%3A%21f%2CexistsSelected%3A%21f%2CfieldName%3Akibana.alert.workflow_status%2CselectedOptions%3A%21%28%29%2Ctitle%3AStatus%29%29&flyout=%28panelView%3AeventDetail%2Cparams%3A%28eventId%3Atest-alert-id%2CindexName%3A.internal.alerts-security.alerts-default%29%29`,
        state: undefined,
      });
    });
  });

  describe('When expandable flyout is enabled', () => {
    beforeEach(() => {
      jest.mocked(useIsExperimentalFeatureEnabled).mockReturnValue(true);
    });

    describe('when eventFlyout or flyout are not in the query', () => {
      it('redirects to the expected path with the correct query parameters', () => {
        const testSearch = `?index=${testIndex}&timestamp=${testTimestamp}`;
        const historyMock = {
          ...mockHistory,
          location: {
            hash: '',
            pathname: mockPathname,
            search: testSearch,
            state: '',
          },
        };
        render(
          <TestProviders>
            <Router history={historyMock}>
              <AlertDetailsRedirect />
            </Router>
          </TestProviders>
        );

        const [{ search, pathname }] = historyMock.replace.mock.lastCall;

        expect(search as string).toMatch(/flyout.*/);
        expect(pathname).toEqual(ALERTS_PATH);
      });
    });
  });
});
