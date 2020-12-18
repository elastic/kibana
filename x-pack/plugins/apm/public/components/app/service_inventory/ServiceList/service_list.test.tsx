/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { mockMoment, renderWithTheme } from '../../../../utils/testHelpers';
import { ServiceList } from './';
import props from './__fixtures__/props.json';

type ServiceListAPIResponse = APIReturnType<'GET /api/apm/services'>;

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MockApmPluginContextWrapper>
      <MemoryRouter>{children}</MemoryRouter>
    </MockApmPluginContextWrapper>
  );
}

describe('ServiceList', () => {
  beforeAll(() => {
    mockMoment();
  });

  it('renders empty state', () => {
    expect(() =>
      renderWithTheme(<ServiceList items={[]} />, { wrapper: Wrapper })
    ).not.toThrowError();
  });

  it('renders with data', () => {
    expect(() =>
      renderWithTheme(
        <ServiceList
          items={(props.items as unknown) as ServiceListAPIResponse['items']}
        />,
        { wrapper: Wrapper }
      )
    ).not.toThrowError();
  });

  describe('without ML data', () => {
    it('does not render the health column', () => {
      const { queryByText } = renderWithTheme(
        <ServiceList
          items={(props.items as unknown) as ServiceListAPIResponse['items']}
        />,
        {
          wrapper: Wrapper,
        }
      );
      const healthHeading = queryByText('Health');

      expect(healthHeading).toBeNull();
    });

    it('sorts by transactions per minute', async () => {
      const { findByTitle } = renderWithTheme(
        <ServiceList
          items={(props.items as unknown) as ServiceListAPIResponse['items']}
        />,
        {
          wrapper: Wrapper,
        }
      );

      expect(
        await findByTitle('Trans. per minute; Sorted in descending order')
      ).toBeInTheDocument();
    });
  });

  describe('with ML data', () => {
    it('renders the health column', async () => {
      const { findByTitle } = renderWithTheme(
        <ServiceList
          items={((props.items as unknown) as ServiceListAPIResponse['items']).map(
            (item) => ({
              ...item,
              healthStatus: ServiceHealthStatus.warning,
            })
          )}
        />,
        { wrapper: Wrapper }
      );

      expect(
        await findByTitle('Health; Sorted in descending order')
      ).toBeInTheDocument();
    });
  });
});
