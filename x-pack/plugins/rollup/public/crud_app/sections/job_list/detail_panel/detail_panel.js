/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
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

const tabs = ['Summary', 'Terms', 'Histogram', 'Metrics', 'JSON'];

export class DetailPanel extends Component {
  static defaultProps = {
    job: {},
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
          onClick={() => openDetailPanel({ panelType: tab, job })}
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
      job: {
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
      },
    } = this.props;

    if (!panelType) {
      return null;
    }

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
        maxWidth="520px"
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
      </EuiFlyout>
    );
  }
}
