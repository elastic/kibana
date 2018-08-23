/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectI18n } from '@kbn/i18n/react';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiTab,
  EuiTabs,
  EuiSpacer,
} from '@elastic/eui';

import {
  TabSummary,
  TabTerms,
  TabMetrics,
  TabJson,
  TabHistogram,
} from './tabs';

import { JobActionMenu } from '../../components';

const tabs = ['Summary', 'Terms', 'Histogram', 'Metrics', 'JSON'];

export class DetailPanelUi extends Component {
  static propTypes = {
    job: PropTypes.object,
    panelType: PropTypes.oneOf(tabs),
    closeDetailPanel: PropTypes.func.isRequired,
    openDetailPanel: PropTypes.func.isRequired,
  }

  static defaultProps = {
    panelType: tabs[0],
  }

  constructor(props) {
    super(props);
  }

  renderTabs() {
    const { panelType, job, openDetailPanel } = this.props;

    return tabs.map((tab, index) => {
      if (tab === 'Terms' && !job.terms.fields.length) {
        return;
      }

      if (tab === 'Histogram' && !job.histogram.fields.length) {
        return;
      }

      if (tab === 'Metrics' && !job.metrics.length) {
        return;
      }

      const isSelected = tab === panelType;
      return (
        <EuiTab
          onClick={() => openDetailPanel({ panelType: tab, jobId: job.id })}
          isSelected={isSelected}
          data-test-subj={`detailPanelTab${isSelected ? 'Selected' : ''}`}
          key={index}
        >
          {tab}
        </EuiTab>
      );
    }).filter(tab => tab);
  }

  render() {
    const {
      panelType,
      closeDetailPanel,
      job,
      intl,
    } = this.props;

    if (!job) {
      return null;
    }

    const {
      id,
      indexPattern,
      rollupIndex,
      rollupCron,
      rollupInterval,
      rollupDelay,
      dateHistogramTimeZone,
      dateHistogramField,
      metrics,
      terms,
      histogram,
      status,
      documentsProcessed,
      pagesProcessed,
      rollupsIndexed,
      triggerCount,
      json,
    } = job;

    const tabToContentMap = {
      Summary: (
        <TabSummary
          id={id}
          indexPattern={indexPattern}
          rollupIndex={rollupIndex}
          rollupCron={rollupCron}
          rollupInterval={rollupInterval}
          rollupDelay={rollupDelay}
          dateHistogramTimeZone={dateHistogramTimeZone}
          dateHistogramField={dateHistogramField}
          documentsProcessed={documentsProcessed}
          pagesProcessed={pagesProcessed}
          rollupsIndexed={rollupsIndexed}
          triggerCount={triggerCount}
          status={status}
        />
      ),
      Terms: (
        <TabTerms terms={terms} />
      ),
      Histogram: (
        <TabHistogram histogram={histogram} />
      ),
      Metrics: (
        <TabMetrics metrics={metrics} />
      ),
      JSON: (
        <TabJson json={json} />
      ),
    };

    const content = tabToContentMap[panelType];

    return (
      <EuiFlyout
        data-test-subj="indexDetailFlyout"
        onClose={closeDetailPanel}
        aria-labelledby="rollupJobDetailsFlyoutTitle"
        size="m"
      >
        <EuiFlyoutHeader>
          <EuiTitle size="m" id="rollupJobDetailsFlyoutTitle">
            <h2>{id}</h2>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiTabs>
            {this.renderTabs()}
          </EuiTabs>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {content}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <JobActionMenu
                iconSide="left"
                jobs={[job]}
                anchorPosition="upRight"
                detailPanel={true}
                iconType="arrowUp"
                label={intl.formatMessage({
                  id: 'xpack.rollupJobs.detailPanel.jobActionMenu.buttonLabel',
                  defaultMessage: 'Manage',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}

export const DetailPanel = injectI18n(DetailPanelUi);
