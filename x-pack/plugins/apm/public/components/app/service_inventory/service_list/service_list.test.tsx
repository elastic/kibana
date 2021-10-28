/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/testing-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { Breakpoints } from '../../../../hooks/use_breakpoints';
import { getServiceColumns } from './';
import * as stories from './service_list.stories';

const { Example, EmptyState, WithHealthWarnings } = composeStories(stories);

describe('ServiceList', () => {
  it('renders empty state', async () => {
    render(<EmptyState />);

    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('renders with data', async () => {
    render(<Example />);

    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  describe('responsive columns', () => {
    const query = {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      environment: ENVIRONMENT_ALL.value,
      kuery: '',
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
          breakpoints: {
            isSmall: true,
            isLarge: true,
            isXl: true,
          } as Breakpoints,
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
          <ListMetric
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
          breakpoints: {
            isSmall: false,
            isLarge: true,
            isXl: true,
          } as Breakpoints,
        }).map((c) =>
          c.render ? c.render!(service[c.field!], service) : service[c.field!]
        );
        expect(renderedColumns.length).toEqual(5);
        expect(renderedColumns[2]).toMatchInlineSnapshot(`
          <ListMetric
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
            breakpoints: {
              isSmall: false,
              isLarge: false,
              isXl: true,
            } as Breakpoints,
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
            <ListMetric
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
            breakpoints: {
              isSmall: false,
              isLarge: false,
              isXl: false,
            } as Breakpoints,
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
            <ListMetric
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
    it('sorts by throughput', async () => {
      render(<Example />);

      expect(await screen.findByTitle('Throughput')).toBeInTheDocument();
    });
  });

  describe('with ML data', () => {
    it('renders the health column', async () => {
      render(<WithHealthWarnings />);

      expect(
        await screen.findByRole('button', { name: /Health/ })
      ).toBeInTheDocument();
    });
  });
});
