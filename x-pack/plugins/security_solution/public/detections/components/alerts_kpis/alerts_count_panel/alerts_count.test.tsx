/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { AlertsCount } from './alerts_count';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import { TestProviders } from '../../../../common/mock';
import { DragDropContextWrapper } from '../../../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import type { AlertsCountAggregation } from './types';
import { emptyStackByField0Response } from './mocks/mock_response_empty_field0';
import {
  buckets as oneGroupByResponseBuckets,
  mockMultiGroupResponse,
} from './mocks/mock_response_multi_group';
import {
  buckets as twoGroupByResponseBuckets,
  singleGroupResponse,
} from './mocks/mock_response_single_group';

jest.mock('../../../../common/lib/kibana');
const mockDispatch = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('AlertsCount', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <AlertsCount
        data={{} as AlertSearchResponse<{}, AlertsCountAggregation>}
        loading={false}
        stackByField0={'test_selected_field'}
        stackByField1={undefined}
      />
    );

    expect(wrapper.find('[data-test-subj="alertsCountTable"]').exists()).toBeTruthy();
  });

  it('renders the expected table body message when stackByField0 is an empty string', () => {
    const wrapper = mount(
      <TestProviders>
        <AlertsCount
          data={emptyStackByField0Response}
          loading={false}
          stackByField0={''}
          stackByField1={undefined}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="alertsCountTable"] tbody').text()).toEqual(
      'No items found'
    );
  });

  describe('one group by field', () => {
    oneGroupByResponseBuckets.forEach((bucket, i) => {
      it(`renders the expected stackByField0 column text for bucket '${bucket.key}'`, () => {
        const wrapper = mount(
          <TestProviders>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <AlertsCount
                data={mockMultiGroupResponse}
                loading={false}
                stackByField0={'kibana.alert.rule.name'}
                stackByField1={undefined}
              />
            </DragDropContextWrapper>
          </TestProviders>
        );

        expect(
          wrapper
            .find(`[data-test-subj="stackByField0Key"] div.euiTableCellContent`)
            .hostNodes()
            .at(i)
            .text()
        ).toEqual(bucket.key);
      });
    });

    oneGroupByResponseBuckets.forEach((bucket, i) => {
      it(`renders the expected doc_count column value for bucket '${bucket.key}'`, () => {
        const wrapper = mount(
          <TestProviders>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <AlertsCount
                data={mockMultiGroupResponse}
                loading={false}
                stackByField0={'test_selected_field'}
                stackByField1={undefined}
              />
            </DragDropContextWrapper>
          </TestProviders>
        );

        expect(
          wrapper
            .find(`[data-test-subj="doc_count"] div.euiTableCellContent`)
            .hostNodes()
            .at(i)
            .text()
        ).toEqual(`${bucket.doc_count}`);
      });
    });
  });

  describe('two group by fields: stackByField0 column', () => {
    let resultRow = 0;

    twoGroupByResponseBuckets.forEach((bucket) => {
      bucket.stackByField1.buckets.forEach((b) => {
        it(`renders the expected stackByField0 column text for stackByField0: '${bucket.key}', stackByField1 '${b.key}'`, () => {
          const wrapper = mount(
            <TestProviders>
              <DragDropContextWrapper browserFields={mockBrowserFields}>
                <AlertsCount
                  data={singleGroupResponse}
                  loading={false}
                  stackByField0={'kibana.alert.rule.name'}
                  stackByField1={'host.name'}
                />
              </DragDropContextWrapper>
            </TestProviders>
          );

          expect(
            wrapper
              .find(`[data-test-subj="stackByField0Key"] div.euiTableCellContent`)
              .hostNodes()
              .at(resultRow++)
              .text()
          ).toEqual(bucket.key);
        });
      });
    });
  });

  describe('two group by fields: stackByField1 column', () => {
    let resultRow = 0;

    twoGroupByResponseBuckets.forEach((bucket) => {
      bucket.stackByField1.buckets.forEach((b, i) => {
        it(`renders the expected stackByField1 column text for stackByField0: '${bucket.key}', stackByField1 '${b.key}'`, () => {
          const wrapper = mount(
            <TestProviders>
              <DragDropContextWrapper browserFields={mockBrowserFields}>
                <AlertsCount
                  data={singleGroupResponse}
                  loading={false}
                  stackByField0={'kibana.alert.rule.name'}
                  stackByField1={'host.name'}
                />
              </DragDropContextWrapper>
            </TestProviders>
          );

          expect(
            wrapper
              .find(`[data-test-subj="stackByField1Key"] div.euiTableCellContent`)
              .hostNodes()
              .at(resultRow++)
              .text()
          ).toEqual(b.key);
        });
      });
    });
  });

  describe('two group by fields: stackByField1DocCount column', () => {
    let resultRow = 0;

    twoGroupByResponseBuckets.forEach((bucket) => {
      bucket.stackByField1.buckets.forEach((b, i) => {
        it(`renders the expected doc_count column value for stackByField0: '${bucket.key}', stackByField1 '${b.key}'`, () => {
          const wrapper = mount(
            <TestProviders>
              <DragDropContextWrapper browserFields={mockBrowserFields}>
                <AlertsCount
                  data={singleGroupResponse}
                  loading={false}
                  stackByField0={'kibana.alert.rule.name'}
                  stackByField1={'host.name'}
                />
              </DragDropContextWrapper>
            </TestProviders>
          );

          expect(
            wrapper
              .find(`[data-test-subj="stackByField1DocCount"] div.euiTableCellContent`)
              .hostNodes()
              .at(resultRow++)
              .text()
          ).toEqual(`${b.doc_count}`);
        });
      });
    });
  });
});
