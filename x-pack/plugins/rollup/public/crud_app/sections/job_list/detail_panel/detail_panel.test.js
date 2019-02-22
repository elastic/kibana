/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../__jest__/utils';
import { getJob } from '../../../../../fixtures';
import { rollupJobsStore } from '../../../store';
import { DetailPanel } from './detail_panel';
import {
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_JSON,
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
    let testSubjectExists;

    beforeEach(() => {
      ({ component, findTestSubject } = initTestBed());
    });

    it('should have the title set to the current Job "id"', () => {
      const { job } = defaultProps;
      const title = findTestSubject('rollupJobDetailsFlyoutTitle');
      expect(title.length).toBe(1);
      expect(title.text()).toEqual(job.id);
    });

    it('should have children if it\'s open', () => {
      expect(component.find('DetailPanelUi').children().length).toBeTruthy();
    });

    it('should *not* have children if it\s closed', () => {
      ({ component } = initTestBed({ isOpen: false }));
      expect(component.find('DetailPanelUi').children().length).toBeFalsy();
    });

    it('should show a loading when the job is loading', () => {
      ({ component, findTestSubject, testSubjectExists } = initTestBed({ isLoading: true }));
      const loading = findTestSubject('rollupJobDetailLoading');
      expect(loading.length).toBeTruthy();
      expect(loading.text()).toEqual('Loading rollup job...');

      // Make sure the title and the tabs are visible
      expect(testSubjectExists('detailPanelTabSelected')).toBeTruthy();
      expect(testSubjectExists('rollupJobDetailsFlyoutTitle')).toBeTruthy();
    });

    it('should display a message when no job is provided', () => {
      ({ component, findTestSubject } = initTestBed({ job: undefined }));
      expect(findTestSubject('rollupJobDetailJobNotFound').text()).toEqual('Rollup job not found');
    });
  });

  describe('tabs', () => {
    const tabActive = JOB_DETAILS_TAB_SUMMARY;
    const { component } = initTestBed({ panelType: tabActive });
    const tabs = component.find('EuiTab');
    const getTab = (id) => {
      const found = tabs.findWhere((tab) => {
        return tab.text() === tabToHumanizedMap[id].props.defaultMessage;
      });
      return found.first();
    };

    it('should have 5 tabs visible', () => {
      const tabsLabel = tabs.map(tab => tab.text());

      expect(tabsLabel).toEqual(['Summary', 'Terms', 'Histogram', 'Metrics', 'JSON']);
    });

    it('should set default selected tab to the "panelType" prop provided', () => {
      const tab = getTab(tabActive);
      expect(tab.props().isSelected).toEqual(true);
    });

    it('should select the tab when clicking on it', () => {
      const { job, openDetailPanel } = defaultProps;
      const termsTab = getTab(JOB_DETAILS_TAB_TERMS);

      termsTab.simulate('click');

      expect(openDetailPanel.mock.calls.length).toBe(1);
      expect(openDetailPanel.mock.calls[0][0]).toEqual({
        jobId: job.id,
        panelType: JOB_DETAILS_TAB_TERMS
      });
    });
  });

  describe('job detail', () => {
    describe('summary tab content', () => {
      // Init testBed on the SUMMARY tab
      const panelType = JOB_DETAILS_TAB_SUMMARY;
      const { findTestSubject } = initTestBed({ panelType });

      const tabContentSections = ['Logistics', 'DateHistogram', 'Stats']
        .map((section) => findTestSubject(`rollupJobDetailSummary${section}Section`))
        .filter(s => !!s.length)
        .map(reactWrapper => ({
          title: reactWrapper.find('EuiTitle').text(),
          reactWrapper,
        }));

      it('should have a "Logistics", "Date histogram" and "Stats" section', () => {
        const expectedTitles = ['Logistics', 'Date histogram', 'Stats'];
        expect(tabContentSections.map(section => section.title)).toEqual(expectedTitles);
      });

      describe('Logistics section', () => {
        const LOGISTICS_SUBSECTIONS = ['Index pattern', 'Rollup index', 'Cron ', 'Delay'];

        const logisticsSubSections = findTestSubject('rollupJobDetailSummaryLogisticItem')
          .map(item => ({
            title: item.childAt(0).text(),
            description: item.childAt(1).text(),
          }));

        it('should have "Index pattern", "Rollup index", "Cron" and "Delay" subsections', () => {
          const logisticsSubsectionsTitles = logisticsSubSections.map(subSection => subSection.title);
          expect(logisticsSubsectionsTitles).toEqual(LOGISTICS_SUBSECTIONS);
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

      describe('Date histogram section', () => {
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
                throw(new Error('Should not get here. The constant DATE_HISTOGRAMS_SUBSECTIONS is probably missing a new subsection'));
            }
          });
        });
      });

      describe('Stats section', () => {
        const STATS_SUBSECTIONS = ['Documents processed', 'Pages processed', 'Rollups indexed', 'Trigger count'];

        const statsSubSections = findTestSubject('rollupJobDetailSummaryStatsItem')
          .map(item => ({
            title: item.childAt(0).text(),
            description: item.childAt(1).text(),
          }));

        it('should have "Documents processed", "Pages processed", "Rollups indexed" and "Trigger count" subsections', () => {
          expect(statsSubSections.map(i => i.title)).toEqual(STATS_SUBSECTIONS);
        });

        it('should set the correct job value for each of the subsection', () => {
          STATS_SUBSECTIONS.forEach((section) => {
            const { description } = statsSubSections.find(({ title }) => title === section);

            switch(section) {
              case 'Documents processed':
                expect(description).toEqual(defaultJob.documentsProcessed.toString());
                break;
              case 'Pages processed':
                expect(description).toEqual(defaultJob.pagesProcessed.toString());
                break;
              case 'Rollups indexed':
                expect(description).toEqual(defaultJob.rollupsIndexed.toString());
                break;
              case 'Trigger count':
                expect(description).toEqual(defaultJob.triggerCount.toString());
                break;
              default:
                // Should never get here... if it does a section is missing in the constant
                throw(new Error('Should not get here. The constant STATS_SUBSECTIONS is probably missing a new subsection'));
            }
          });
        });

        it('should display the job status', () => {
          const statsSection = tabContentSections.find(section => section.title === 'Stats');
          expect(statsSection.reactWrapper.find('EuiHealth').text()).toEqual('Stopped');
        });
      });
    });

    describe('terms tab content', () => {
      // Init testBed on the TERMS tab
      const panelType = JOB_DETAILS_TAB_TERMS;
      const { findTestSubject } = initTestBed({ panelType });
      const tabContent = findTestSubject('rollupJobDetailTabContent');
      const getRowsText = () => (
        tabContent
          .find('tr')
          .map(row => row.text())
          .slice(1) // we remove the first row as it is the table header
      );
      it('should list the Job terms fields', () => {
        const rowsText = getRowsText();
        const expected = defaultJob.terms.map(term => term.name);
        expect(rowsText).toEqual(expected);
      });
    });

    describe('histogram tab content', () => {
      // Init testBed on the HISTOGRAM tab
      const panelType = JOB_DETAILS_TAB_HISTOGRAM;
      const { findTestSubject } = initTestBed({ panelType });
      const tabContent = findTestSubject('rollupJobDetailTabContent');
      const getRowsText = () => (
        tabContent
          .find('tr')
          .map(row => row.text())
          .slice(1) // we remove the first row as it is the table header
      );

      it('should list the Job histogram fields', () => {
        const rowsText = getRowsText();
        const expected = defaultJob.histogram.map(h => h.name);
        expect(rowsText).toEqual(expected);
      });
    });

    describe('metrics tab content', () => {
      // Init testBed on the METRICS tab
      const panelType = JOB_DETAILS_TAB_METRICS;
      const { findTestSubject } = initTestBed({ panelType });
      const tabContent = findTestSubject('rollupJobDetailTabContent');
      const getRows = () => (
        tabContent
          .find('tr')
          .slice(1)
      );
      it('should list the Job metrics fields and their types', () => {
        const rows = getRows();

        rows.forEach((row, i) => {
          const metric = defaultJob.metrics[i];

          row.find('td').forEach((cell, j) => {
            if (j === 0) {
              // field
              expect(cell.text()).toEqual(metric.name);
            } else if (j === 1) {
              // types
              expect(cell.text()).toEqual(metric.types.join(', '));
            }
          });
        });
      });
    });

    describe('JSON tab content', () => {
      // Init testBed on the JSON tab
      const panelType = JOB_DETAILS_TAB_JSON;
      const { findTestSubject } = initTestBed({ panelType });
      const tabContent = findTestSubject('rollupJobDetailTabContent');

      it('should render the "EuiCodeEditor" with the job "json" data', () => {
        const euiCodeEditor = tabContent.find('EuiCodeEditor');
        expect(euiCodeEditor.length).toBeTruthy();
        expect(JSON.parse(euiCodeEditor.props().value)).toEqual(defaultJob.json);
      });
    });
  });
});
