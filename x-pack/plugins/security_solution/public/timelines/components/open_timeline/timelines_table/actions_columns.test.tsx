/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIconProps } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { cloneDeep, omit } from 'lodash/fp';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { mockTimelineResults } from '../../../../common/mock/timeline_results';
import { OpenTimelineResult } from '../types';
import { TimelinesTableProps } from '.';
import { getMockTimelinesTableProps } from './mocks';

jest.mock('../../../../common/lib/kibana');

const { TimelinesTable } = jest.requireActual('.');

describe('#getActionsColumns', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  let mockResults: OpenTimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  test('it renders the delete timeline (trash icon) when actionTimelineToShow is including the action delete', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      actionTimelineToShow: ['delete'],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="delete-timeline"]').exists()).toBe(true);
  });

  test('it does NOT render the delete timeline (trash icon) when actionTimelineToShow is NOT including the action delete', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      actionTimelineToShow: [],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="delete-timeline"]').exists()).toBe(false);
  });

  test('it renders the duplicate icon timeline when actionTimelineToShow is including the action duplicate', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      actionTimelineToShow: ['duplicate'],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="open-duplicate"]').exists()).toBe(true);
  });

  test('it renders only duplicate icon (without heading)', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      actionTimelineToShow: ['duplicate'],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="open-duplicate"]').first().text()).toEqual('');
  });

  test('it does NOT render the duplicate timeline when actionTimelineToShow is NOT including the action duplicate)', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      actionTimelineToShow: [],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="open-duplicate"]').exists()).toBe(false);
  });

  test('it does NOT render the delete timeline (trash icon) when deleteTimelines is not provided', () => {
    const testProps: TimelinesTableProps = {
      ...omit('deleteTimelines', getMockTimelinesTableProps(mockResults)),
      actionTimelineToShow: ['delete'],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="delete-timeline"]').exists()).toBe(false);
  });

  test('it renders a disabled the open duplicate button if the timeline does not have a saved object id', () => {
    const missingSavedObjectId: OpenTimelineResult[] = [
      omit('savedObjectId', { ...mockResults[0] }),
    ];

    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(missingSavedObjectId),
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    const props = wrapper
      .find('[data-test-subj="open-duplicate"]')
      .first()
      .props() as EuiButtonIconProps;
    expect(props.isDisabled).toBe(true);
  });

  test('it renders an enabled the open duplicate button if the timeline has have a saved object id', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    const props = wrapper
      .find('[data-test-subj="open-duplicate"]')
      .first()
      .props() as EuiButtonIconProps;

    expect(props.isDisabled).toBe(false);
  });

  test('it invokes onOpenTimeline with the expected params when the button is clicked', () => {
    const onOpenTimeline = jest.fn();
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      onOpenTimeline,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="open-duplicate"]').first().simulate('click');

    expect(onOpenTimeline).toBeCalledWith({ duplicate: true, timelineId: 'saved-timeline-11' });
  });

  test('it renders the export icon when enableExportTimelineDownloader is including the action export', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      actionTimelineToShow: ['export'],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );
    expect(wrapper.find('[data-test-subj="export-timeline"]').exists()).toBe(true);
  });

  test('it renders No export icon when export is not included in the action ', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );
    expect(wrapper.find('[data-test-subj="export-timeline"]').exists()).toBe(false);
  });

  test('it renders a disabled the export button if the timeline does not have a saved object id', () => {
    const missingSavedObjectId: OpenTimelineResult[] = [
      omit('savedObjectId', { ...mockResults[0] }),
    ];

    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(missingSavedObjectId),
      actionTimelineToShow: ['export'],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    const props = wrapper
      .find('[data-test-subj="export-timeline"]')
      .first()
      .props() as EuiButtonIconProps;
    expect(props.isDisabled).toBe(true);
  });

  test('it invokes enableExportTimelineDownloader with the expected params when the button is clicked', () => {
    const enableExportTimelineDownloader = jest.fn();
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      actionTimelineToShow: ['export'],
      enableExportTimelineDownloader,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="export-timeline"]').first().simulate('click');

    expect(enableExportTimelineDownloader).toBeCalledWith(mockResults[0]);
  });
});
