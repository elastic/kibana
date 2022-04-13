/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty, EuiContextMenuItem } from '@elastic/eui';
import { mount } from 'enzyme';
import React from 'react';
import { mockCasesContext } from '../../../../../../cases/public/mocks/mock_cases_context';
import { TestProviders } from '../../../mock';
import { ShowTopNButton } from './show_top_n';

jest.mock('../../visualization_actions', () => ({
  VisualizationActions: jest.fn(() => <div data-test-subj="mock-viz-actions" />),
}));

jest.mock('../../../lib/kibana', () => {
  const original = jest.requireActual('../../../lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        cases: {
          ui: {
            getCasesContext: jest.fn().mockReturnValue(mockCasesContext),
          },
        },
      },
    }),
  };
});

describe('show topN button', () => {
  const defaultProps = {
    field: 'signal.rule.name',
    onClick: jest.fn(),
    ownFocus: false,
    showTopN: false,
    timelineId: 'timeline-1',
    value: ['rule_name'],
  };

  describe('button', () => {
    test('should show EuiButtonIcon by default', () => {
      const wrapper = mount(
        <TestProviders>
          <ShowTopNButton {...defaultProps} />
        </TestProviders>
      );
      expect(wrapper.find('EuiButtonIcon').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="show-top-field"]').first().prop('iconType')).toEqual(
        'visBarVertical'
      );
    });

    test('should support EuiButtonEmpty', () => {
      const testProps = {
        ...defaultProps,
        Component: EuiButtonEmpty,
      };
      const wrapper = mount(
        <TestProviders>
          <ShowTopNButton {...testProps} />
        </TestProviders>
      );
      expect(wrapper.find('EuiButtonIcon').exists()).toBeFalsy();
      expect(wrapper.find('EuiButtonEmpty').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="show-top-field"]').first().prop('iconType')).toEqual(
        'visBarVertical'
      );
    });

    test('should support EuiContextMenuItem', () => {
      const testProps = {
        ...defaultProps,
        Component: EuiContextMenuItem,
      };
      const wrapper = mount(
        <TestProviders>
          <ShowTopNButton {...testProps} />
        </TestProviders>
      );
      expect(wrapper.find('EuiButtonIcon').exists()).toBeFalsy();
      expect(wrapper.find('EuiContextMenuItem').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="show-top-field"]').first().prop('icon')).toEqual(
        'visBarVertical'
      );
    });
  });

  describe('tooltip', () => {
    test('should show tooltip by default', () => {
      const wrapper = mount(
        <TestProviders>
          <ShowTopNButton {...defaultProps} />
        </TestProviders>
      );
      expect(wrapper.find('EuiToolTip').exists()).toBeTruthy();
    });

    test('should hide tooltip when topN is showed', () => {
      const testProps = {
        ...defaultProps,
        showTopN: true,
      };
      const wrapper = mount(
        <TestProviders>
          <ShowTopNButton {...testProps} />
        </TestProviders>
      );
      expect(wrapper.find('EuiToolTip').exists()).toBeFalsy();
    });

    test('should hide tooltip by setting showTooltip to false', () => {
      const testProps = {
        ...defaultProps,
        showTooltip: false,
      };
      const wrapper = mount(
        <TestProviders>
          <ShowTopNButton {...testProps} />
        </TestProviders>
      );
      expect(wrapper.find('EuiToolTip').exists()).toBeFalsy();
    });
  });

  describe('popover', () => {
    test('should be able to show topN without a popover', () => {
      const testProps = {
        ...defaultProps,
        enablePopOver: false,
        showTopN: true,
      };
      const wrapper = mount(
        <TestProviders>
          <ShowTopNButton {...testProps} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="top-n"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="showTopNContainer"]').exists()).toBeFalsy();
    });
    test('should be able to show topN within a popover', () => {
      const testProps = {
        ...defaultProps,
        enablePopOver: true,
        showTopN: true,
      };
      const wrapper = mount(
        <TestProviders>
          <ShowTopNButton {...testProps} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="top-n"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="showTopNContainer"]').exists()).toBeTruthy();
    });
  });

  describe('topN', () => {
    test('should render with correct props', () => {
      const onFilterAdded = jest.fn();
      const testProps = {
        ...defaultProps,
        enablePopOver: true,
        showTopN: true,
        onFilterAdded,
      };
      const wrapper = mount(
        <TestProviders>
          <ShowTopNButton {...testProps} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="top-n"]').prop('field')).toEqual(testProps.field);
      expect(wrapper.find('[data-test-subj="top-n"]').prop('value')).toEqual(testProps.value);
      expect(wrapper.find('[data-test-subj="top-n"]').prop('toggleTopN')).toEqual(
        testProps.onClick
      );
      expect(wrapper.find('[data-test-subj="top-n"]').prop('timelineId')).toEqual(
        testProps.timelineId
      );
      expect(wrapper.find('[data-test-subj="top-n"]').prop('onFilterAdded')).toEqual(
        testProps.onFilterAdded
      );
    });
  });
});
