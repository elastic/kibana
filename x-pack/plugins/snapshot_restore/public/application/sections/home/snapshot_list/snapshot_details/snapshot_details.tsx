/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
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
} from '@elastic/eui';
import React, { Fragment, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { SnapshotDetails as ISnapshotDetails } from '../../../../../../common/types';
import { SectionError, Error } from '../../../../../shared_imports';
import { SectionLoading, SnapshotDeleteProvider } from '../../../../components';
import { useServices } from '../../../../app_context';
import {
  UIM_SNAPSHOT_DETAIL_PANEL_SUMMARY_TAB,
  UIM_SNAPSHOT_DETAIL_PANEL_FAILED_INDICES_TAB,
  SNAPSHOT_STATE,
} from '../../../../constants';
import { useLoadSnapshot } from '../../../../services/http';
import { linkToRepository, linkToRestoreSnapshot } from '../../../../services/navigation';
import { TabSummary, TabFailures } from './tabs';

import { reactRouterNavigate } from '../../../../../../../../../src/plugins/kibana_react/public';

interface Props {
  repositoryName: string;
  snapshotId: string;
  onClose: () => void;
  onSnapshotDeleted: (snapshotsDeleted: Array<{ snapshot: string; repository: string }>) => void;
}

const TAB_SUMMARY = 'summary';
const TAB_FAILURES = 'failures';

const panelTypeToUiMetricMap: { [key: string]: string } = {
  [TAB_SUMMARY]: UIM_SNAPSHOT_DETAIL_PANEL_SUMMARY_TAB,
  [TAB_FAILURES]: UIM_SNAPSHOT_DETAIL_PANEL_FAILED_INDICES_TAB,
};

export const SnapshotDetails: React.FunctionComponent<Props> = ({
  repositoryName,
  snapshotId,
  onClose,
  onSnapshotDeleted,
}) => {
  const { i18n, uiMetricService, history } = useServices();
  const { error, data: snapshotDetails } = useLoadSnapshot(repositoryName, snapshotId);

  const [activeTab, setActiveTab] = useState<string>(TAB_SUMMARY);

  // Reset tab when we look at a different snapshot.
  useEffect(() => {
    setActiveTab(TAB_SUMMARY);
  }, [repositoryName, snapshotId]);

  let tabs;

  let content;

  if (snapshotDetails) {
    const { indexFailures, state: snapshotState } = snapshotDetails as ISnapshotDetails;
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
          {tabOptions.map((tab) => (
            <EuiTab
              onClick={() => {
                uiMetricService.trackUiMetric(panelTypeToUiMetricMap[tab.id]);
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
    const notFound = (error as any).status === 404;
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
        error={errorObject as Error}
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

        {snapshotDetails ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <SnapshotDeleteProvider>
                  {(deleteSnapshotPrompt) => {
                    return (
                      <EuiButtonEmpty
                        color="danger"
                        data-test-subj="srSnapshotDetailsDeleteActionButton"
                        onClick={() =>
                          deleteSnapshotPrompt(
                            [{ repository: repositoryName, snapshot: snapshotId }],
                            onSnapshotDeleted
                          )
                        }
                        isDisabled={
                          snapshotDetails.managedRepository &&
                          snapshotDetails.isLastSuccessfulSnapshot
                        }
                        title={
                          snapshotDetails.managedRepository &&
                          snapshotDetails.isLastSuccessfulSnapshot
                            ? i18n.translate(
                                'xpack.snapshotRestore.snapshotDetails.deleteManagedRepositorySnapshotButtonTitle',
                                {
                                  defaultMessage:
                                    'You cannot delete the last successful snapshot stored in a managed repository.',
                                }
                              )
                            : undefined
                        }
                      >
                        <FormattedMessage
                          id="xpack.snapshotRestore.snapshotDetails.deleteButtonLabel"
                          defaultMessage="Delete"
                        />
                      </EuiButtonEmpty>
                    );
                  }}
                </SnapshotDeleteProvider>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButton
                  {...reactRouterNavigate(
                    history,
                    linkToRestoreSnapshot(repositoryName, snapshotId)
                  )}
                  fill
                  color="primary"
                  isDisabled={
                    snapshotDetails.state !== SNAPSHOT_STATE.SUCCESS &&
                    snapshotDetails.state !== SNAPSHOT_STATE.PARTIAL
                  }
                >
                  <FormattedMessage
                    id="xpack.snapshotRestore.snapshotDetails.restoreButtonLabel"
                    defaultMessage="Restore"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  };

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="snapshotDetail"
      aria-labelledby="srSnapshotDetailsFlyoutTitle"
      size="m"
      maxWidth={550}
    >
      <EuiFlyoutHeader>
        <EuiText>
          <h2 id="srSnapshotDetailsFlyoutTitle" data-test-subj="detailTitle">
            {snapshotId}
          </h2>
          <p>
            <small>
              <EuiLink
                {...reactRouterNavigate(history, linkToRepository(repositoryName))}
                data-test-subj="repositoryLink"
              >
                <FormattedMessage
                  id="xpack.snapshotRestore.snapshotDetails.repositoryTitle"
                  defaultMessage="'{repositoryName}' repository"
                  values={{ repositoryName }}
                />
              </EuiLink>
            </small>
          </p>
        </EuiText>
        {tabs}
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="content">{content}</EuiFlyoutBody>
      <EuiFlyoutFooter>{renderFooter()}</EuiFlyoutFooter>
    </EuiFlyout>
  );
};
