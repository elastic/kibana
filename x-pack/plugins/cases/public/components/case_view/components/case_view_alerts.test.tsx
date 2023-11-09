/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { OBSERVABILITY_OWNER } from '../../../../common/constants';
import { alertCommentWithIndices, basicCase } from '../../../containers/mock';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import type { CaseUI } from '../../../../common';
import { CaseViewAlerts } from './case_view_alerts';
import * as api from '../../../containers/api';

jest.mock('../../../containers/api');

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertCommentWithIndices],
};

describe('CaseUI View Page activity tab', () => {
  const getAlertsStateTableMock = jest.fn();
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    appMockRender.coreStart.triggersActionsUi.getAlertsStateTable =
      getAlertsStateTableMock.mockReturnValue(<div data-test-subj="alerts-table" />);
    jest.clearAllMocks();
  });

  it('should render the alerts table', async () => {
    const result = appMockRender.render(<CaseViewAlerts caseData={caseData} />);
    await waitFor(async () => {
      expect(result.getByTestId('alerts-table')).toBeTruthy();
    });
  });

  it('should call the alerts table with correct props for security solution', async () => {
    appMockRender.render(<CaseViewAlerts caseData={caseData} />);
    await waitFor(async () => {
      expect(getAlertsStateTableMock).toHaveBeenCalledWith({
        alertsTableConfigurationRegistry: expect.anything(),
        configurationId: 'securitySolution-case',
        featureIds: ['siem', 'observability'],
        id: 'case-details-alerts-securitySolution',
        query: {
          ids: {
            values: ['alert-id-1'],
          },
        },
        showAlertStatusWithFlapping: false,
      });
    });
  });

  it('should call the alerts table with correct props for observability', async () => {
    const getFeatureIdsMock = jest.spyOn(api, 'getFeatureIds');
    getFeatureIdsMock.mockResolvedValueOnce(['observability']);
    appMockRender.render(
      <CaseViewAlerts
        caseData={{
          ...caseData,
          owner: OBSERVABILITY_OWNER,
        }}
      />
    );

    await waitFor(async () => {
      expect(getAlertsStateTableMock).toHaveBeenCalledWith({
        alertsTableConfigurationRegistry: expect.anything(),
        configurationId: 'observability',
        featureIds: ['observability'],
        id: 'case-details-alerts-observability',
        query: {
          ids: {
            values: ['alert-id-1'],
          },
        },
        showAlertStatusWithFlapping: true,
      });
    });
  });

  it('should call the getFeatureIds with the correct registration context', async () => {
    const getFeatureIdsMock = jest.spyOn(api, 'getFeatureIds');
    appMockRender.render(<CaseViewAlerts caseData={caseData} />);
    await waitFor(async () => {
      expect(getFeatureIdsMock).toHaveBeenCalledWith({
        query: { registrationContext: ['matchme'] },
        signal: expect.anything(),
      });
    });
  });

  it('should show an empty prompt when the cases has no alerts', async () => {
    const result = appMockRender.render(
      <CaseViewAlerts
        caseData={{
          ...caseData,
          comments: [],
        }}
      />
    );
    await waitFor(async () => {
      expect(result.getByTestId('caseViewAlertsEmpty')).toBeTruthy();
    });
  });
});
