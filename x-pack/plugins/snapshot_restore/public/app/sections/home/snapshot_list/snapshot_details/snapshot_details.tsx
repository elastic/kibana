/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { SectionError, SectionLoading } from '../../../../components';
import { useAppDependencies } from '../../../../index';
import { loadSnapshot } from '../../../../services/http';
import { formatDate } from '../../../../services/text';
import { linkToRepository } from '../../../../services/navigation';

interface Props extends RouteComponentProps {
  repositoryName: string;
  snapshotId: string;
  onClose: () => void;
}

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

  const includeGlobalStateToHumanizedMap: Record<string, any> = {
    0: (
      <FormattedMessage
        id="xpack.snapshotRestore.snapshotDetails.itemIncludeGlobalStateNoLabel"
        defaultMessage="No"
      />
    ),
    1: (
      <FormattedMessage
        id="xpack.snapshotRestore.snapshotDetails.itemIncludeGlobalStateYesLabel"
        defaultMessage="Yes"
      />
    ),
  };

  let content;

  if (snapshotDetails) {
    const {
      versionId,
      version,
      // TODO: Add a tooltip explaining that: a false value means that the cluster global state
      // is not stored as part of the snapshot.
      includeGlobalState,
      indices,
      state,
      failures,
      startTimeInMillis,
      endTimeInMillis,
      durationInMillis,
      uuid,
    } = snapshotDetails;

    const indicesList = indices.length ? (
      <ul>
        {indices.map((index: string) => (
          <li key={index}>
            <EuiTitle size="xs">
              <span>{index}</span>
            </EuiTitle>
          </li>
        ))}
      </ul>
    ) : (
      <FormattedMessage
        id="xpack.snapshotRestore.snapshotDetails.itemIndicesNoneLabel"
        data-test-subj="srSnapshotDetailsIndicesNoneTitle"
        defaultMessage="-"
      />
    );

    const failuresList = failures.length ? (
      <ul>
        {failures.map((failure: any) => (
          <li key={failure}>
            <EuiTitle size="xs">
              <span>{JSON.stringify(failure)}</span>
            </EuiTitle>
          </li>
        ))}
      </ul>
    ) : (
      <FormattedMessage
        id="xpack.snapshotRestore.snapshotDetails.itemfFailuresNoneLabel"
        data-test-subj="srSnapshotDetailsFailuresNoneTitle"
        defaultMessage="-"
      />
    );

    content = (
      <EuiDescriptionList textStyle="reverse">
        <EuiFlexGroup>
          <EuiFlexItem data-test-subj="srSnapshotDetailsVersionItem">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotDetails.itemVersionLabel"
                data-test-subj="srSnapshotDetailsVersionTitle"
                defaultMessage="Version / Version ID"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription
              className="eui-textBreakWord"
              data-test-subj="srSnapshotDetailsVersionDescription"
            >
              {version} / {versionId}
            </EuiDescriptionListDescription>
          </EuiFlexItem>

          <EuiFlexItem data-test-subj="srSnapshotDetailsIncludeGlobalUuidItem">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotDetails.itemUuidLabel"
                data-test-subj="srSnapshotDetailsUuidTitle"
                defaultMessage="UUID"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription
              className="eui-textBreakWord"
              data-test-subj="srSnapshotDetailUuidDescription"
            >
              {uuid}
            </EuiDescriptionListDescription>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          <EuiFlexItem data-test-subj="srSnapshotDetailsIncludeGlobalStateItem">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotDetails.itemIncludeGlobalStateLabel"
                data-test-subj="srSnapshotDetailsIncludeGlobalStateTitle"
                defaultMessage="Includes global state"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription
              className="eui-textBreakWord"
              data-test-subj="srSnapshotDetailIncludeGlobalStateDescription"
            >
              {includeGlobalStateToHumanizedMap[includeGlobalState]}
            </EuiDescriptionListDescription>
          </EuiFlexItem>

          <EuiFlexItem data-test-subj="srSnapshotDetailsStateItem">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotDetails.itemStateLabel"
                data-test-subj="srSnapshotDetailsStateTitle"
                defaultMessage="State"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription
              className="eui-textBreakWord"
              data-test-subj="srSnapshotDetailStateDescription"
            >
              {state}
            </EuiDescriptionListDescription>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          <EuiFlexItem data-test-subj="srSnapshotDetailsIndicesItem">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotDetails.itemIndicesLabel"
                data-test-subj="srSnapshotDetailsIndicesTitle"
                defaultMessage="Indices ({indicesCount})"
                values={{ indicesCount: indices.length }}
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription
              className="eui-textBreakWord"
              data-test-subj="srSnapshotDetailIndicesDescription"
            >
              <EuiText>{indicesList}</EuiText>
            </EuiDescriptionListDescription>
          </EuiFlexItem>

          <EuiFlexItem data-test-subj="srSnapshotDetailsFailuresItem">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotDetails.itemFailuresLabel"
                data-test-subj="srSnapshotDetailsFailuresTitle"
                defaultMessage="Failures ({failuresCount})"
                values={{ failuresCount: failures.length }}
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription
              className="eui-textBreakWord"
              data-test-subj="srSnapshotDetailFailuresDescription"
            >
              {failuresList}
            </EuiDescriptionListDescription>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          <EuiFlexItem data-test-subj="srSnapshotDetailsStartTimeItem">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotDetails.itemStartTimeLabel"
                data-test-subj="srSnapshotDetailsStartTimeTitle"
                defaultMessage="Start time"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription
              className="eui-textBreakWord"
              data-test-subj="srSnapshotDetailStartTimeDescription"
            >
              {formatDate(startTimeInMillis)}
            </EuiDescriptionListDescription>
          </EuiFlexItem>

          <EuiFlexItem data-test-subj="srSnapshotDetailsEndTimeItem">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotDetails.itemEndTimeLabel"
                data-test-subj="srSnapshotDetailsEndTimeTitle"
                defaultMessage="End time"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription
              className="eui-textBreakWord"
              data-test-subj="srSnapshotDetailEndTimeDescription"
            >
              {formatDate(endTimeInMillis)}
            </EuiDescriptionListDescription>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          <EuiFlexItem data-test-subj="srSnapshotDetailsDurationItem">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotDetails.itemDurationLabel"
                data-test-subj="srSnapshotDetailsDurationTitle"
                defaultMessage="Duration"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription
              className="eui-textBreakWord"
              data-test-subj="srSnapshotDetailDurationDescription"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotDetails.itemDurationValueLabel"
                data-test-subj="srSnapshotDetailsDurationValue"
                defaultMessage="{seconds} seconds"
                values={{ seconds: Math.round(durationInMillis / 1000) }}
              />
            </EuiDescriptionListDescription>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiDescriptionList>
    );
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
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="srSnapshotDetailsContent">{content}</EuiFlyoutBody>
    </EuiFlyout>
  );
};

export const SnapshotDetails = withRouter(SnapshotDetailsUi);
