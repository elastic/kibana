/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiErrorBoundary,
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
  UIM_DETAIL_PANEL_SUMMARY_TAB_CLICK,
  UIM_DETAIL_PANEL_TERMS_TAB_CLICK,
  UIM_DETAIL_PANEL_HISTOGRAM_TAB_CLICK,
  UIM_DETAIL_PANEL_METRICS_TAB_CLICK,
  UIM_DETAIL_PANEL_JSON_TAB_CLICK,
} from '../../../../../common';
import { trackUiMetric } from '../../../services';

import {
  JobActionMenu,
  JobDetails,
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_JSON,
  tabToHumanizedMap,
} from '../../components';

export const JOB_DETAILS_TABS = [
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_JSON,
];

const tabToUiMetricMap = {
  [JOB_DETAILS_TAB_SUMMARY]: UIM_DETAIL_PANEL_SUMMARY_TAB_CLICK,
  [JOB_DETAILS_TAB_TERMS]: UIM_DETAIL_PANEL_TERMS_TAB_CLICK,
  [JOB_DETAILS_TAB_HISTOGRAM]: UIM_DETAIL_PANEL_HISTOGRAM_TAB_CLICK,
  [JOB_DETAILS_TAB_METRICS]: UIM_DETAIL_PANEL_METRICS_TAB_CLICK,
  [JOB_DETAILS_TAB_JSON]: UIM_DETAIL_PANEL_JSON_TAB_CLICK,
};

export class DetailPanelUi extends Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool,
    job: PropTypes.object,
    jobId: PropTypes.string,
    panelType: PropTypes.oneOf(JOB_DETAILS_TABS),
    closeDetailPanel: PropTypes.func.isRequired,
    openDetailPanel: PropTypes.func.isRequired,
  }

  static defaultProps = {
    panelType: JOB_DETAILS_TABS[0],
  }

  constructor(props) {
    super(props);
  }

  renderTabs() {
    const { panelType, job, openDetailPanel } = this.props;

    if (!job) {
      return;
    }

    const {
      id,
      terms,
      histogram,
      metrics,
    } = job;

    const renderedTabs = [];

    JOB_DETAILS_TABS.map((tab, index) => {
      if (tab === JOB_DETAILS_TAB_TERMS && !terms.length) {
        return;
      }

      if (tab === JOB_DETAILS_TAB_HISTOGRAM && !histogram.length) {
        return;
      }

      if (tab === JOB_DETAILS_TAB_METRICS && !metrics.length) {
        return;
      }

      const isSelected = tab === panelType;
      renderedTabs.push(
        <EuiTab
          onClick={() => {
            trackUiMetric(tabToUiMetricMap[tab]);
            openDetailPanel({ panelType: tab, jobId: id });
          }}
          isSelected={isSelected}
          data-test-subj={`detailPanelTab${isSelected ? 'Selected' : ''}`}
          key={index}
        >
          {tabToHumanizedMap[tab]}
        </EuiTab>
      );
    });

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
      status,
      documentsProcessed,
      pagesProcessed,
      rollupsIndexed,
      triggerCount,
      json,
    } = job;

    const stats = {
      status,
      documentsProcessed,
      pagesProcessed,
      rollupsIndexed,
      triggerCount,
    };

    return (
      <Fragment>
        <EuiFlyoutBody data-test-subj="rollupJobDetailTabContent">
          <EuiErrorBoundary>
            <JobDetails
              tab={panelType}
              job={job}
              stats={stats}
              json={json}
            />
          </EuiErrorBoundary>
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
        <EuiFlyoutBody
          data-test-subj="rollupJobDetailLoading"
        >
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
                    id="xpack.rollupJobs.detailPanel.loadingLabel"
                    defaultMessage="Loading rollup job..."
                  />
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      );
    } else if (job) {
      content = this.renderJob();
    } else {
      content = (
        <EuiFlyoutBody
          data-test-subj="rollupJobDetailJobNotFound"
        >
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
                    id="xpack.rollupJobs.detailPanel.notFoundLabel"
                    defaultMessage="Rollup job not found"
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
        data-test-subj="rollupJobDetailFlyout"
        onClose={closeDetailPanel}
        aria-labelledby="rollupJobDetailsFlyoutTitle"
        size="m"
        maxWidth={400}
      >
        <EuiFlyoutHeader>
          <EuiTitle
            size="m"
            id="rollupJobDetailsFlyoutTitle"
            data-test-subj="rollupJobDetailsFlyoutTitle"
          >
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
