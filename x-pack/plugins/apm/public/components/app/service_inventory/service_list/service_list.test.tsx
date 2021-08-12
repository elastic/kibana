/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { BreakPoints } from '../../../../hooks/use_break_points';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { mockMoment, renderWithTheme } from '../../../../utils/testHelpers';
import { getServiceColumns, ServiceList } from './';
import { items } from './__fixtures__/service_api_mock_data';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/services?rangeFrom=now-15m&rangeTo=now']}>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

describe('ServiceList', () => {
  beforeAll(() => {
    mockMoment();
  });

  it('renders empty state', () => {
    expect(() =>
      renderWithTheme(<ServiceList isLoading={false} items={[]} />, {
        wrapper: Wrapper,
      })
    ).not.toThrowError();
  });

  it('renders with data', () => {
    expect(() =>
      renderWithTheme(<ServiceList isLoading={false} items={items} />, {
        wrapper: Wrapper,
      })
    ).not.toThrowError();
  });

  describe('responsive columns', () => {
    const query = {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };

    const service: any = {
      serviceName: 'opbeans-python',
      agentName: 'python',
      transactionsPerMinute: {
        value: 86.93333333333334,
        timeseries: [],
      },
      errorsPerMinute: {
        value: 12.6,
        timeseries: [],
      },
      avgResponseTime: {
        value: 91535.42944785276,
        timeseries: [],
      },
      environments: ['test'],
      transactionType: 'request',
    };
    describe('when small', () => {
      it('shows environment, transaction type and sparklines', () => {
        const renderedColumns = getServiceColumns({
          query,
          showTransactionTypeColumn: true,
          breakPoints: {
            isSmall: true,
            isLarge: true,
            isXl: true,
          } as BreakPoints,
        }).map((c) =>
          c.render ? c.render!(service[c.field!], service) : service[c.field!]
        );
        expect(renderedColumns.length).toEqual(7);
        expect(renderedColumns[2]).toMatchInlineSnapshot(`
          <EnvironmentBadge
            environments={
              Array [
                "test",
              ]
            }
          />
        `);
        expect(renderedColumns[3]).toMatchInlineSnapshot(`"request"`);
        expect(renderedColumns[4]).toMatchInlineSnapshot(`
          <ServiceListMetric
            color="euiColorVis1"
            hideSeries={false}
            valueLabel="0 ms"
          />
        `);
      });
    });

    describe('when Large', () => {
      it('hides environment, transaction type and sparklines', () => {
        const renderedColumns = getServiceColumns({
          query,
          showTransactionTypeColumn: true,
          breakPoints: {
            isSmall: false,
            isLarge: true,
            isXl: true,
          } as BreakPoints,
        }).map((c) =>
          c.render ? c.render!(service[c.field!], service) : service[c.field!]
        );
        expect(renderedColumns.length).toEqual(5);
        expect(renderedColumns[2]).toMatchInlineSnapshot(`
          <ServiceListMetric
            color="euiColorVis1"
            hideSeries={true}
            valueLabel="0 ms"
          />
        `);
      });

      describe('when XL', () => {
        it('hides transaction type', () => {
          const renderedColumns = getServiceColumns({
            query,
            showTransactionTypeColumn: true,
            breakPoints: {
              isSmall: false,
              isLarge: false,
              isXl: true,
            } as BreakPoints,
          }).map((c) =>
            c.render ? c.render!(service[c.field!], service) : service[c.field!]
          );
          expect(renderedColumns.length).toEqual(6);
          expect(renderedColumns[2]).toMatchInlineSnapshot(`
            <EnvironmentBadge
              environments={
                Array [
                  "test",
                ]
              }
            />
          `);
          expect(renderedColumns[3]).toMatchInlineSnapshot(`
            <ServiceListMetric
              color="euiColorVis1"
              hideSeries={false}
              valueLabel="0 ms"
            />
          `);
        });
      });

      describe('when XXL', () => {
        it('hides transaction type', () => {
          const renderedColumns = getServiceColumns({
            query,
            showTransactionTypeColumn: true,
            breakPoints: {
              isSmall: false,
              isLarge: false,
              isXl: false,
            } as BreakPoints,
          }).map((c) =>
            c.render ? c.render!(service[c.field!], service) : service[c.field!]
          );
          expect(renderedColumns.length).toEqual(7);
          expect(renderedColumns[2]).toMatchInlineSnapshot(`
          <EnvironmentBadge
            environments={
              Array [
                "test",
              ]
            }
          />
        `);
          expect(renderedColumns[3]).toMatchInlineSnapshot(`"request"`);
          expect(renderedColumns[4]).toMatchInlineSnapshot(`
          <ServiceListMetric
            color="euiColorVis1"
            hideSeries={false}
            valueLabel="0 ms"
          />
        `);
        });
      });
    });
  });

  describe('without ML data', () => {
    it('does not render the health column', () => {
      const { queryByText } = renderWithTheme(
        <ServiceList isLoading={false} items={items} />,
        {
          wrapper: Wrapper,
        }
      );
      const healthHeading = queryByText('Health');

      expect(healthHeading).toBeNull();
    });

    it('sorts by throughput', async () => {
      const { findByTitle } = renderWithTheme(
        <ServiceList isLoading={false} items={items} />,
        {
          wrapper: Wrapper,
        }
      );

      expect(await findByTitle('Throughput')).toBeInTheDocument();
    });
  });

  describe('with ML data', () => {
    it('renders the health column', async () => {
      const { findByTitle } = renderWithTheme(
        <ServiceList
          isLoading={false}
          items={items.map((item) => ({
            ...item,
            healthStatus: ServiceHealthStatus.warning,
          }))}
        />,
        { wrapper: Wrapper }
      );

      expect(await findByTitle('Health')).toBeInTheDocument();
    });
  });
});
