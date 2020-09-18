/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { NO_ALERT_INDEX } from '../../../../common/constants';
import { ModalInspectQuery, formatIndexPatternRequested } from './modal';

const request =
  '{"index": ["auditbeat-*","filebeat-*","packetbeat-*","winlogbeat-*"],"allowNoIndices": true, "ignoreUnavailable": true, "body": { "aggregations": {"hosts": {"cardinality": {"field": "host.name" } }, "hosts_histogram": {"auto_date_histogram": {"field": "@timestamp","buckets": "6"},"aggs": { "count": {"cardinality": {"field": "host.name" }}}}}, "query": {"bool": {"filter": [{"range": { "@timestamp": {"gte": 1562290224506,"lte": 1562376624506 }}}]}}, "size": 0, "track_total_hits": false}}';
const response =
  '{"took": 880,"timed_out": false,"_shards": {"total": 26,"successful": 26,"skipped": 0,"failed": 0},"hits": {"max_score": null,"hits": []},"aggregations": {"hosts": {"value": 541},"hosts_histogram": {"buckets": [{"key_as_string": "2019 - 07 - 05T01: 00: 00.000Z", "key": 1562288400000, "doc_count": 1492321, "count": { "value": 105 }}, {"key_as_string": "2019 - 07 - 05T13: 00: 00.000Z", "key": 1562331600000, "doc_count": 2412761, "count": { "value": 453}},{"key_as_string": "2019 - 07 - 06T01: 00: 00.000Z", "key": 1562374800000, "doc_count": 111658, "count": { "value": 15}}],"interval": "12h"}},"status": 200}';

describe('Modal Inspect', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  const closeModal = jest.fn();

  describe('rendering', () => {
    test('when isShowing is positive and request and response are not null', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <ModalInspectQuery
            closeModal={closeModal}
            isShowing={true}
            request={request}
            response={response}
            title="My title"
          />
        </ThemeProvider>
      );
      expect(wrapper.find('[data-test-subj="modal-inspect-euiModal"]').first().exists()).toBe(true);
      expect(wrapper.find('.euiModalHeader__title').first().text()).toBe('Inspect My title');
    });

    test('when isShowing is negative and request and response are not null', () => {
      const wrapper = mount(
        <ModalInspectQuery
          closeModal={closeModal}
          isShowing={false}
          request={request}
          response={response}
          title="My title"
        />
      );
      expect(wrapper.find('[data-test-subj="modal-inspect-euiModal"]').first().exists()).toBe(
        false
      );
    });

    test('when isShowing is positive and request is null and response is not null', () => {
      const wrapper = mount(
        <ModalInspectQuery
          closeModal={closeModal}
          isShowing={true}
          request={null}
          response={response}
          title="My title"
        />
      );
      expect(wrapper.find('[data-test-subj="modal-inspect-euiModal"]').first().exists()).toBe(
        false
      );
    });

    test('when isShowing is positive and request is not null and response is null', () => {
      const wrapper = mount(
        <ModalInspectQuery
          closeModal={closeModal}
          isShowing={true}
          request={request}
          response={null}
          title="My title"
        />
      );
      expect(wrapper.find('[data-test-subj="modal-inspect-euiModal"]').first().exists()).toBe(
        false
      );
    });
  });

  describe('functionality from tab statistics/request/response', () => {
    test('Click on statistic Tab', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <ModalInspectQuery
            closeModal={closeModal}
            isShowing={true}
            request={request}
            response={response}
            title="My title"
          />
        </ThemeProvider>
      );

      wrapper.find('.euiTab').first().simulate('click');
      wrapper.update();

      expect(
        wrapper.find('.euiDescriptionList__title span[data-test-subj="index-pattern-title"]').text()
      ).toBe('Index pattern ');
      expect(
        wrapper
          .find('.euiDescriptionList__description span[data-test-subj="index-pattern-description"]')
          .text()
      ).toBe('auditbeat-*, filebeat-*, packetbeat-*, winlogbeat-*');
      expect(
        wrapper.find('.euiDescriptionList__title span[data-test-subj="query-time-title"]').text()
      ).toBe('Query time ');
      expect(
        wrapper
          .find('.euiDescriptionList__description span[data-test-subj="query-time-description"]')
          .text()
      ).toBe('880ms');
      expect(
        wrapper
          .find('.euiDescriptionList__title span[data-test-subj="request-timestamp-title"]')
          .text()
      ).toBe('Request timestamp ');
    });

    test('Click on request Tab', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <ModalInspectQuery
            closeModal={closeModal}
            isShowing={true}
            request={request}
            response={response}
            title="My title"
          />
        </ThemeProvider>
      );

      wrapper.find('.euiTab').at(2).simulate('click');
      wrapper.update();

      expect(JSON.parse(wrapper.find('EuiCodeBlock').first().text())).toEqual({
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

    test('Click on response Tab', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <ModalInspectQuery
            closeModal={closeModal}
            isShowing={true}
            request={request}
            response={response}
            title="My title"
          />
        </ThemeProvider>
      );

      wrapper.find('.euiTab').at(1).simulate('click');
      wrapper.update();

      expect(JSON.parse(wrapper.find('EuiCodeBlock').first().text())).toEqual({
        aggregations: {
          hosts: { cardinality: { field: 'host.name' } },
          hosts_histogram: {
            aggs: { count: { cardinality: { field: 'host.name' } } },
            auto_date_histogram: { buckets: '6', field: '@timestamp' },
          },
        },
        query: {
          bool: {
            filter: [{ range: { '@timestamp': { gte: 1562290224506, lte: 1562376624506 } } }],
          },
        },
        size: 0,
        track_total_hits: false,
      });
    });
  });

  describe('events', () => {
    test('Make sure that toggle function has been called when you click on the close button', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <ModalInspectQuery
            closeModal={closeModal}
            isShowing={true}
            request={request}
            response={response}
            title="My title"
          />
        </ThemeProvider>
      );

      wrapper.find('button[data-test-subj="modal-inspect-close"]').simulate('click');
      wrapper.update();
      expect(closeModal).toHaveBeenCalled();
    });
  });

  describe('formatIndexPatternRequested', () => {
    test('Return specific messages to NO_ALERT_INDEX if we only have one index and we match the index name `NO_ALERT_INDEX`', () => {
      const expected = formatIndexPatternRequested([NO_ALERT_INDEX]);
      expect(expected).toEqual(<i>{'No alert index found'}</i>);
    });

    test('Ignore NO_ALERT_INDEX if you have more than one indices', () => {
      const expected = formatIndexPatternRequested([NO_ALERT_INDEX, 'indice-1']);
      expect(expected).toEqual('indice-1');
    });

    test('Happy path', () => {
      const expected = formatIndexPatternRequested(['indice-1, indice-2']);
      expect(expected).toEqual('indice-1, indice-2');
    });

    test('Empty array with no indices', () => {
      const expected = formatIndexPatternRequested([]);
      expect(expected).toEqual('Sorry about that, something went wrong.');
    });

    test('Undefined indices', () => {
      const expected = formatIndexPatternRequested(undefined);
      expect(expected).toEqual('Sorry about that, something went wrong.');
    });
  });
});
