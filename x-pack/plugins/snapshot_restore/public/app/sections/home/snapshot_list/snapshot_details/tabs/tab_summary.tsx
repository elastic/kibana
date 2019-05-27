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
      defaultMessage="-"
    />
  );

  return (
    <EuiDescriptionList textStyle="reverse">
      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="version">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotDetails.itemVersionLabel"
              defaultMessage="Version / Version ID"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            {version} / {versionId}
          </EuiDescriptionListDescription>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="uuid">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotDetails.itemUuidLabel"
              defaultMessage="UUID"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            {uuid}
          </EuiDescriptionListDescription>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="state">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotDetails.itemStateLabel"
              defaultMessage="State"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            <SnapshotState state={state} />
          </EuiDescriptionListDescription>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="includeGlobalState">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotDetails.itemIncludeGlobalStateLabel"
              defaultMessage="Includes global state"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            {includeGlobalStateToHumanizedMap[includeGlobalState]}
          </EuiDescriptionListDescription>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="indices">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotDetails.itemIndicesLabel"
              defaultMessage="Indices ({indicesCount})"
              values={{ indicesCount: indices.length }}
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            <EuiText>{indicesList}</EuiText>
          </EuiDescriptionListDescription>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="startTime">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotDetails.itemStartTimeLabel"
              defaultMessage="Start time"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            <DataPlaceholder data={startTimeInMillis}>
              {formatDate(startTimeInMillis)}
            </DataPlaceholder>
          </EuiDescriptionListDescription>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="endTime">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotDetails.itemEndTimeLabel"
              defaultMessage="End time"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
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
        <EuiFlexItem data-test-subj="duration">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotDetails.itemDurationLabel"
              defaultMessage="Duration"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
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
