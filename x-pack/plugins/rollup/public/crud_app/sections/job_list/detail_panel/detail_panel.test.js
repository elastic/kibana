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

const defaultJob = getJob();

const defaultProps = {
  isOpen: true,
  isLoading: false,
  job: defaultJob,
  jobId: defaultJob.id,
  panelType: JOB_DETAILS_TAB_SUMMARY,
  closeDetailPanel: jest.fn(),
  openDetailPanel: jest.fn(),
};

const initTestBed = registerTestBed(DetailPanel, defaultProps, rollupJobsStore);

describe('<DetailPanel />', () => {
  describe('layout', () => {
    let component;
    let findTestSubject;

    beforeEach(() => {
      ({ component, findTestSubject } = initTestBed());
    });

    it('should have the title set to the Job id', () => {
      const { job } = defaultProps;
      const title = component.find('#rollupJobDetailsFlyoutTitle').hostNodes();
      expect(title.length).toBeTruthy();
      expect(title.text()).toEqual(job.id);
    });

    it('should have children if it\'s open', () => {
      expect(component.find('DetailPanelUi').children().length).toBeTruthy();
    });

    it('should have no content if it\s closed', () => {
      ({ component } = initTestBed({ isOpen: false }));
      expect(component.find('DetailPanelUi').children().length).toBeFalsy();
    });

    it('should show a loading when the job is loading', () => {
      ({ component, findTestSubject } = initTestBed({ isLoading: true }));
      const loading = findTestSubject('rollupJobDetailLoading');
      expect(loading.length).toBeTruthy();
      expect(loading.text()).toEqual('Loading rollup job...');

      // Make sure the title and the tabs are visible
      expect(component.find('EuiTab').length).toBeTruthy();
      expect(component.find('#rollupJobDetailsFlyoutTitle').length).toBeTruthy();
    });

    it('should display a message when no job is provided', () => {
      ({ component, findTestSubject } = initTestBed({ job: undefined }));
      expect(findTestSubject('rollupJobDetailFlyout').find('EuiFlyoutBody').text()).toEqual('Rollup job not found');
    });
  });

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

  describe('job detail', () => {
    describe('summary Tab', () => {
      const panelType = JOB_DETAILS_TAB_SUMMARY;
      const { findTestSubject } = initTestBed({ panelType });
      const tabContent = findTestSubject('rollupJobDetailTabContent');
      const tabSections = tabContent.find('EuiTitle').map(title => title.text());

      it('should have a "Logistics", "Date histogram" and "Stats" section ', () => {
        const expected = ['Logistics', 'Date histogram', 'Stats'];
        expect(tabSections).toEqual(expected);
      });

      describe('Logistics section', () => {
        const LOGISTICS_SUBSECTIONS = ['Index pattern', 'Rollup index', 'Cron ', 'Delay'];

        const logisticsSubSections = findTestSubject('rollupJobDetailSummaryLogisticItem')
          .map(item => ({
            title: item.childAt(0).text(),
            description: item.childAt(1).text(),
          }));

        it('should have "Index pattern", "Rollup index", "Cron" and "Delay" subsections', () => {
          expect(logisticsSubSections.map(i => i.title)).toEqual(LOGISTICS_SUBSECTIONS);
        });

        it('should set the correct job value for each of the subsection', () => {
          LOGISTICS_SUBSECTIONS.forEach((section) => {
            const { description } = logisticsSubSections.find(({ title }) => title === section);

            switch(section) {
              case 'Index pattern':
                expect(description).toEqual(defaultJob.indexPattern);
                break;
              case 'Cron ':
                expect(description).toEqual(defaultJob.rollupCron);
                break;
              case 'Delay':
                expect(description).toEqual(defaultJob.rollupDelay);
                break;
              case 'Rollup index':
                expect(description).toEqual(defaultJob.rollupIndex);
                break;
              default:
                // Should never get here... if it does a section is missing in the constant
                throw(new Error('Should not get here. The constant LOGISTICS_SUBSECTIONS is probably missing a new subsection'));
            }
          });
        });
      });

      describe('Date histogram', () => {
        const DATE_HISTOGRAMS_SUBSECTIONS = ['Time field', 'Timezone', 'Interval '];

        const dateHistogramSubSections = findTestSubject('rollupJobDetailSummaryDateHistogramItem')
          .map(item => ({
            title: item.childAt(0).text(),
            description: item.childAt(1).text(),
          }));

        it('should have "Time field", "Timezone", "Interval" subsections', () => {
          expect(dateHistogramSubSections.map(i => i.title)).toEqual(DATE_HISTOGRAMS_SUBSECTIONS);
        });

        it('should set the correct job value for each of the subsection', () => {
          DATE_HISTOGRAMS_SUBSECTIONS.forEach((section) => {
            const { description } = dateHistogramSubSections.find(({ title }) => title === section);

            switch(section) {
              case 'Time field':
                expect(description).toEqual(defaultJob.dateHistogramField);
                break;
              case 'Interval ':
                expect(description).toEqual(defaultJob.dateHistogramInterval);
                break;
              case 'Timezone':
                expect(description).toEqual(defaultJob.dateHistogramTimeZone);
                break;
              default:
                // Should never get here... if it does a section is missing in the constant
                throw(new Error('Should not get here. The constant LOGISTICS_SUBSECTIONS is probably missing a new subsection'));
            }
          });
        });
      });
    });
  });
});
