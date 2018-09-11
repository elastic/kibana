/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextColor,
  EuiTitle,
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
    isOpen: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
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

    if (!job) {
      return;
    }

    const renderedTabs = tabs.map((tab, index) => {
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

    return (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiTabs>
          {renderedTabs}
        </EuiTabs>
      </Fragment>
    );
  }

  renderJob() {
    const { panelType, job, intl } = this.props;

    const {
      id,
      indexPattern,
      rollupIndex,
      rollupCron,
      dateHistogramInterval,
      dateHistogramDelay,
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
          dateHistogramInterval={dateHistogramInterval}
          dateHistogramDelay={dateHistogramDelay}
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

    const tabContent = tabToContentMap[panelType];

    return (
      <Fragment>
        <EuiFlyoutBody>
          {tabContent}
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
      </Fragment>
    );
  }

  render() {
    const {
      isOpen,
      isLoading,
      closeDetailPanel,
      job,
      jobId,
    } = this.props;

    if (!isOpen) {
      return null;
    }

    let content;

    if (isLoading) {
      content = (
        <EuiFlyoutBody>
          <EuiFlexGroup
            justifyContent="flexStart"
            alignItems="center"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.rollupJobs.detailPanel.loading.label"
                    defaultMessage="Loading job..."
                  />
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      );
    }

    if (job) {
      content = this.renderJob();
    } else {
      content = (
        <EuiFlyoutBody>
          <EuiFlexGroup
            justifyContent="flexStart"
            alignItems="center"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon size="m" type="alert" color="danger" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.rollupJobs.detailPanel.notFound.label"
                    defaultMessage="Job not found"
                  />
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      );
    }

    return (
      <EuiFlyout
        data-test-subj="indexDetailFlyout"
        onClose={closeDetailPanel}
        aria-labelledby="rollupJobDetailsFlyoutTitle"
        size="m"
        maxWidth={400}
      >
        <EuiFlyoutHeader>
          <EuiTitle size="m" id="rollupJobDetailsFlyoutTitle">
            <h2>{jobId}</h2>
          </EuiTitle>

          {this.renderTabs()}
        </EuiFlyoutHeader>

        {content}
      </EuiFlyout>
    );
  }
}

export const DetailPanel = injectI18n(DetailPanelUi);
