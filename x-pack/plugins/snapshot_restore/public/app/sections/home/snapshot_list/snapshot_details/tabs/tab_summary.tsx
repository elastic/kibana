/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { SNAPSHOT_STATE } from '../../../../../constants';
import { useAppDependencies } from '../../../../../index';
import { formatDate } from '../../../../../services/text';
import { DataPlaceholder } from '../../../../../components';
import { SnapshotState } from './snapshot_state';

interface Props {
  snapshotDetails: any;
}

export const TabSummary: React.SFC<Props> = ({ snapshotDetails }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

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

  const {
    versionId,
    version,
    // TODO: Add a tooltip explaining that: a false value means that the cluster global state
    // is not stored as part of the snapshot.
    includeGlobalState,
    indices,
    state,
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

  return (
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
            <SnapshotState state={state} />
          </EuiDescriptionListDescription>
        </EuiFlexItem>

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
            <DataPlaceholder data={startTimeInMillis}>
              {formatDate(startTimeInMillis)}
            </DataPlaceholder>
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
            {state === SNAPSHOT_STATE.IN_PROGRESS ? (
              <EuiLoadingSpinner size="m" />
            ) : (
              <DataPlaceholder data={endTimeInMillis}>
                {formatDate(endTimeInMillis)}
              </DataPlaceholder>
            )}
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
            {state === SNAPSHOT_STATE.IN_PROGRESS ? (
              <EuiLoadingSpinner size="m" />
            ) : (
              <DataPlaceholder data={durationInMillis}>
                <FormattedMessage
                  id="xpack.snapshotRestore.snapshotDetails.itemDurationValueLabel"
                  data-test-subj="srSnapshotDetailsDurationValue"
                  defaultMessage="{seconds} {seconds, plural, one {second} other {seconds}}"
                  values={{ seconds: Math.ceil(durationInMillis / 1000) }}
                />
              </DataPlaceholder>
            )}
          </EuiDescriptionListDescription>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiDescriptionList>
  );
};
