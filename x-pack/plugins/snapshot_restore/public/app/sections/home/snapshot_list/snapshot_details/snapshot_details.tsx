/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
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
import { loadSnapshot } from '../../../../services/http';
import { linkToRepository } from '../../../../services/navigation';
import { TabSummary, TabFailures } from './tabs';

interface Props extends RouteComponentProps {
  repositoryName: string;
  snapshotId: string;
  onClose: () => void;
}

const TAB_SUMMARY = 'summary';
const TAB_FAILURES = 'failures';

const SnapshotDetailsUi: React.FunctionComponent<Props> = ({
  repositoryName,
  snapshotId,
  onClose,
}) => {
  const {
    core: {
      i18n: { FormattedMessage, translate },
    },
  } = useAppDependencies();

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
    const { indexFailures, state } = snapshotDetails;
    const tabOptions = [
      {
        id: TAB_SUMMARY,
        name: (
          <FormattedMessage
            id="xpack.snapshotRestore.snapshotDetails.summaryTabTitle"
            defaultMessage="Summary"
          />
        ),
        testSubj: 'srSnapshotDetailsSummaryTab',
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
        testSubj: 'srSnapshotDetailsFailuresTab',
      },
    ];

    tabs = (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiTabs>
          {tabOptions.map(tab => (
            <EuiTab
              onClick={() => setActiveTab(tab.id)}
              isSelected={tab.id === activeTab}
              key={tab.id}
              data-test-subject={tab.testSubj}
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
      content = <TabFailures state={state} indexFailures={indexFailures} />;
    }
  } else if (error) {
    const notFound = error.status === 404;
    const errorObject = notFound
      ? {
          data: {
            error: translate('xpack.snapshotRestore.snapshotDetails.errorSnapshotNotFound', {
              defaultMessage: `Either the snapshot '{snapshotId}' doesn't exist in the repository '{repositoryName}' or that repository doesn't exist.`,
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
          id="xpack.snapshotRestore.snapshotDetails.loadingLabel"
          defaultMessage="Loading snapshot…"
        />
      </SectionLoading>
    );
  }

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="srSnapshotDetailsFlyout"
      aria-labelledby="srSnapshotDetailsFlyoutTitle"
      size="m"
      maxWidth={400}
    >
      <EuiFlyoutHeader>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="srSnapshotDetailsFlyoutTitle" data-test-subj="srSnapshotDetailsFlyoutTitle">
                {snapshotId}
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiText size="s">
              <p>
                <EuiLink href={linkToRepository(repositoryName)}>
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

      <EuiFlyoutBody data-test-subj="srSnapshotDetailsContent">{content}</EuiFlyoutBody>
    </EuiFlyout>
  );
};

export const SnapshotDetails = withRouter(SnapshotDetailsUi);
