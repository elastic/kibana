/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../__jest__/utils';
import { getJob } from '../../../../../fixtures';
import { rollupJobsStore } from '../../../store';
import { DetailPanel, JOB_DETAILS_TABS } from './detail_panel';
import {
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  tabToHumanizedMap,
} from '../../components';

const defaultProps = {
  isOpen: true,
  isLoading: false,
  job: getJob(),
  panelType: JOB_DETAILS_TAB_SUMMARY,
  closeDetailPanel: jest.fn(),
  openDetailPanel: jest.fn(),
};

const initTestBed = registerTestBed(DetailPanel, defaultProps, rollupJobsStore);

describe('<DetailPanel />', () => {
  describe('tabs', () => {
    const tabActive = JOB_DETAILS_TAB_SUMMARY;
    const { component } = initTestBed({ panelType: tabActive });
    const tabs = component.find('EuiTab');
    const getTab = (id) => {
      let selectedTab;
      tabs.forEach((tab) => {
        if (tab.text() === tabToHumanizedMap[id].props.defaultMessage) {
          selectedTab = tab;
        }
      });
      return selectedTab;
    };

    it('should have 5 tabs visible', () => {
      const expected = JOB_DETAILS_TABS.map(id => tabToHumanizedMap[id].props.defaultMessage);
      const tabsLabel = tabs.map(tab => tab.text());

      expect(tabsLabel).toEqual(expected);
    });

    it('should set default selected tab to the "panelType" provided', () => {
      const tab = getTab(tabActive);
      expect(tab.props().isSelected).toEqual(true);
    });

    it('should select the tab when clicking on it', () => {
      const { job, openDetailPanel } = defaultProps;
      const termsTab = getTab(JOB_DETAILS_TAB_TERMS);

      expect(termsTab.props().isSelected).toEqual(false);

      termsTab.simulate('click');

      expect(openDetailPanel.mock.calls.length).toBe(1);
      expect(openDetailPanel.mock.calls[0][0]).toEqual({
        jobId: job.id,
        panelType: JOB_DETAILS_TAB_TERMS
      });
    });
  });
});
