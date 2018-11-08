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
  JobActionMenu,
  JobDetails,
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_JSON,
  tabToHumanizedMap,
} from '../../components';

const JOB_DETAILS_TABS = [
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_JSON,
];

export class DetailPanelUi extends Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool,
    job: PropTypes.object,
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
          onClick={() => openDetailPanel({ panelType: tab, jobId: id })}
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
        <EuiFlyoutBody>
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
                    id="xpack.rollupJobs.detailPanel.loadingLabel"
                    defaultMessage="Loading rollup job..."
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
