/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { ModalInspectProps } from './modal';
import { ModalInspectQuery } from './modal';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useLocation: jest.fn().mockReturnValue([{ pathname: '/overview' }]),
  };
});

const getRequest = (
  indices: string[] = ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*']
) =>
  `{"index": ${JSON.stringify(
    indices
  )},"allowNoIndices": true, "ignoreUnavailable": true, "body": { "aggregations": {"hosts": {"cardinality": {"field": "host.name" } }, "hosts_histogram": {"auto_date_histogram": {"field": "@timestamp","buckets": "6"},"aggs": { "count": {"cardinality": {"field": "host.name" }}}}}, "query": {"bool": {"filter": [{"range": { "@timestamp": {"gte": 1562290224506,"lte": 1562376624506 }}}]}}, "size": 0, "track_total_hits": false}}`;

const response =
  '{"took": 880,"timed_out": false,"_shards": {"total": 26,"successful": 26,"skipped": 0,"failed": 0},"hits": {"max_score": null,"hits": []},"aggregations": {"hosts": {"value": 541},"hosts_histogram": {"buckets": [{"key_as_string": "2019 - 07 - 05T01: 00: 00.000Z", "key": 1562288400000, "doc_count": 1492321, "count": { "value": 105 }}, {"key_as_string": "2019 - 07 - 05T13: 00: 00.000Z", "key": 1562331600000, "doc_count": 2412761, "count": { "value": 453}},{"key_as_string": "2019 - 07 - 06T01: 00: 00.000Z", "key": 1562374800000, "doc_count": 111658, "count": { "value": 15}}],"interval": "12h"}},"status": 200}';

describe('Modal Inspect', () => {
  const closeModal = jest.fn();
  const defaultProps: ModalInspectProps = {
    closeModal,
    getInspectQuery: () => ({
      request: [getRequest()],
      response: [response],
    }),
  };

  const renderModalInspectQuery = () => {
    return render(<ModalInspectQuery {...defaultProps} />, {
      wrapper: ({ children }) => <EuiThemeProvider>{children}</EuiThemeProvider>,
    });
  };

  describe('functionality from tab statistics/request/response', () => {
    test('Click on statistic Tab', async () => {
      renderModalInspectQuery();
      fireEvent.click(await screen.findByText('Statistics'));

      expect(await screen.findByText('Index pattern')).toBeInTheDocument();
      expect(screen.getByTestId('index-pattern-description').textContent).toBe(
        'auditbeat-*, filebeat-*, packetbeat-*, winlogbeat-*'
      );
      expect(screen.getByTestId('query-time-title').textContent).toContain('Query time ');
      expect(screen.getByTestId('query-time-description').textContent).toBe('880ms');
      expect(screen.getByTestId('request-timestamp-title').textContent).toContain(
        'Request timestamp '
      );
    });

    test('Click on request Tab', async () => {
      renderModalInspectQuery();

      fireEvent.click(await screen.findByText('Request'));

      const el = await screen.findByRole('tabpanel');

      expect(JSON.parse(el.textContent ?? '')).toEqual({
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        allowNoIndices: true,
        ignoreUnavailable: true,
        body: {
          aggregations: {
            hosts: {
              cardinality: {
                field: 'host.name',
              },
            },
            hosts_histogram: {
              auto_date_histogram: {
                field: '@timestamp',
                buckets: '6',
              },
              aggs: {
                count: {
                  cardinality: {
                    field: 'host.name',
                  },
                },
              },
            },
          },
          query: {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: 1562290224506,
                      lte: 1562376624506,
                    },
                  },
                },
              ],
            },
          },
          size: 0,
          track_total_hits: false,
        },
      });
    });

    test('Click on response Tab', async () => {
      renderModalInspectQuery();

      fireEvent.click(await screen.findByText('Response'));
      const el = await screen.findByRole('tabpanel');

      expect(JSON.parse(el.textContent ?? '')).toEqual({
        took: 880,
        timed_out: false,
        _shards: {
          total: 26,
          successful: 26,
          skipped: 0,
          failed: 0,
        },
        hits: {
          max_score: null,
          hits: [],
        },
        aggregations: {
          hosts: {
            value: 541,
          },
          hosts_histogram: {
            buckets: [
              {
                key_as_string: '2019 - 07 - 05T01: 00: 00.000Z',
                key: 1562288400000,
                doc_count: 1492321,
                count: {
                  value: 105,
                },
              },
              {
                key_as_string: '2019 - 07 - 05T13: 00: 00.000Z',
                key: 1562331600000,
                doc_count: 2412761,
                count: {
                  value: 453,
                },
              },
              {
                key_as_string: '2019 - 07 - 06T01: 00: 00.000Z',
                key: 1562374800000,
                doc_count: 111658,
                count: {
                  value: 15,
                },
              },
            ],
            interval: '12h',
          },
        },
        status: 200,
      });
    });
  });

  describe('events', () => {
    test('Make sure that toggle function has been called when you click on the close button', async () => {
      renderModalInspectQuery();

      fireEvent.click(await screen.findByTestId('modal-inspect-close'));
      expect(closeModal).toHaveBeenCalled();
    });
  });
});
