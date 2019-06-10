/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { Fragment, useState, useEffect } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { SectionError, SectionLoading } from '../../../../components';
import { useAppDependencies } from '../../../../index';
import {
  UIM_SNAPSHOT_DETAIL_PANEL_SUMMARY_TAB,
  UIM_SNAPSHOT_DETAIL_PANEL_FAILED_INDICES_TAB,
} from '../../../../constants';
import { loadSnapshot } from '../../../../services/http';
import { linkToRepository } from '../../../../services/navigation';
import { uiMetricService } from '../../../../services/ui_metric';
import { TabSummary, TabFailures } from './tabs';

interface Props extends RouteComponentProps {
  repositoryName: string;
  snapshotId: string;
  onClose: () => void;
}

const TAB_SUMMARY = 'summary';
const TAB_FAILURES = 'failures';

const panelTypeToUiMetricMap: { [key: string]: string } = {
  [TAB_SUMMARY]: UIM_SNAPSHOT_DETAIL_PANEL_SUMMARY_TAB,
  [TAB_FAILURES]: UIM_SNAPSHOT_DETAIL_PANEL_FAILED_INDICES_TAB,
};

const SnapshotDetailsUi: React.FunctionComponent<Props> = ({
  repositoryName,
  snapshotId,
  onClose,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { trackUiMetric } = uiMetricService;
  const { error, data: snapshotDetails } = loadSnapshot(repositoryName, snapshotId);

  const [activeTab, setActiveTab] = useState<string>(TAB_SUMMARY);

  // Reset tab when we look at a different snapshot.
  useEffect(
    () => {
      setActiveTab(TAB_SUMMARY);
    },
    [repositoryName, snapshotId]
  );

  let tabs;

  let content;

  if (snapshotDetails) {
    const { indexFailures, state: snapshotState } = snapshotDetails;
    const tabOptions = [
      {
        id: TAB_SUMMARY,
        name: (
          <FormattedMessage
            id="xpack.snapshotRestore.snapshotDetails.summaryTabTitle"
            defaultMessage="Summary"
          />
        ),
      },
      {
        id: TAB_FAILURES,
        name: (
          <FormattedMessage
            id="xpack.snapshotRestore.snapshotDetails.failuresTabTitle"
            defaultMessage="Failed indices ({failuresCount})"
            values={{ failuresCount: indexFailures.length }}
          />
        ),
      },
    ];

    tabs = (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiTabs>
          {tabOptions.map(tab => (
            <EuiTab
              onClick={() => {
                trackUiMetric(panelTypeToUiMetricMap[tab.id]);
                setActiveTab(tab.id);
              }}
              isSelected={tab.id === activeTab}
              key={tab.id}
              data-test-subj="tab"
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </Fragment>
    );

    if (activeTab === TAB_SUMMARY) {
      content = <TabSummary snapshotDetails={snapshotDetails} />;
    } else if (activeTab === TAB_FAILURES) {
      content = <TabFailures snapshotState={snapshotState} indexFailures={indexFailures} />;
    }
  } else if (error) {
    const notFound = error.status === 404;
    const errorObject = notFound
      ? {
          data: {
            error: i18n.translate('xpack.snapshotRestore.snapshotDetails.errorSnapshotNotFound', {
              defaultMessage: `Either the snapshot '{snapshotId}' doesn't exist in the repository '{repositoryName}' or the repository doesn't exist.`,
              values: {
                snapshotId,
                repositoryName,
              },
            }),
          },
        }
      : error;

    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.snapshotDetails.errorLoadingRepositoryTitle"
            defaultMessage="Error loading repository"
          />
        }
        error={errorObject}
      />
    );
  } else {
    // Assume the content is loading.
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.snapshotDetails.loadingSnapshotDescription"
          defaultMessage="Loading snapshot…"
        />
      </SectionLoading>
    );
  }

  const renderFooter = () => {
    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            flush="left"
            onClick={onClose}
            data-test-subj="closeButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotDetails.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="snapshotDetail"
      aria-labelledby="srSnapshotDetailsFlyoutTitle"
      size="m"
      maxWidth={400}
    >
      <EuiFlyoutHeader>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="srSnapshotDetailsFlyoutTitle" data-test-subj="detailTitle">
                {snapshotId}
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiText size="s">
              <p>
                <EuiLink href={linkToRepository(repositoryName)} data-test-subj="repositoryLink">
                  <FormattedMessage
                    id="xpack.snapshotRestore.snapshotDetails.repositoryTitle"
                    defaultMessage="'{repositoryName}' repository"
                    values={{ repositoryName }}
                  />
                </EuiLink>
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        {tabs}
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="content">{content}</EuiFlyoutBody>
      <EuiFlyoutFooter>{renderFooter()}</EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const SnapshotDetails = withRouter(SnapshotDetailsUi);
