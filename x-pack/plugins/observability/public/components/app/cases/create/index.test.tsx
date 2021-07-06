/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '../../../../../../../../src/plugins/kibana_react/common';
import { Create } from '.';
import { useKibana } from '../../../../utils/kibana_react';
import { basicCase } from '../../../../../../cases/public/containers/mock';
import { CASES_OWNER } from '../constants';
import { Case } from '../../../../../../cases/common';
import { getCaseDetailsUrl } from '../../../../pages/cases/links';

jest.mock('../../../../utils/kibana_react');

describe('Create case', () => {
  const mockCreateCase = jest.fn();
  const mockNavigateToUrl = jest.fn();
  const mockObservabilityUrl = 'https://elastic.co/app/observability';
  beforeEach(() => {
    jest.resetAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          getCreateCase: mockCreateCase,
        },
        application: { navigateToUrl: mockNavigateToUrl, getUrlForApp: () => mockObservabilityUrl },
      },
    });
  });

  it('it renders', () => {
    mount(
      <EuiThemeProvider>
        <Create />
      </EuiThemeProvider>
    );

    expect(mockCreateCase).toHaveBeenCalled();
    expect(mockCreateCase.mock.calls[0][0].owner).toEqual([CASES_OWNER]);
  });

  it('should redirect to all cases on cancel click', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          getCreateCase: ({ onCancel }: { onCancel: () => Promise<void> }) => {
            onCancel();
          },
        },
        application: { navigateToUrl: mockNavigateToUrl, getUrlForApp: () => mockObservabilityUrl },
      },
    });
    mount(
      <EuiThemeProvider>
        <Create />
      </EuiThemeProvider>
    );

    await waitFor(() =>
      expect(mockNavigateToUrl).toHaveBeenCalledWith(`${mockObservabilityUrl}/cases`)
    );
  });

  it('should redirect to new case when posting the case', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          getCreateCase: ({ onSuccess }: { onSuccess: (theCase: Case) => Promise<void> }) => {
            onSuccess(basicCase);
          },
        },
        application: { navigateToUrl: mockNavigateToUrl, getUrlForApp: () => mockObservabilityUrl },
      },
    });
    mount(
      <EuiThemeProvider>
        <Create />
      </EuiThemeProvider>
    );

    await waitFor(() =>
      expect(mockNavigateToUrl).toHaveBeenNthCalledWith(
        1,
        `${mockObservabilityUrl}/cases${getCaseDetailsUrl({ id: basicCase.id })}`
      )
    );
  });
});
