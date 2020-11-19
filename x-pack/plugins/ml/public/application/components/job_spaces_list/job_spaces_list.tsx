/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { JobSpacesFlyout } from '../job_spaces_selector';
import { JobType } from '../../../../common/types/saved_objects';
import { useSpacesContext } from '../../contexts/spaces';
import { Space, SpaceAvatar } from '../../../../../spaces/public';

export const ALL_SPACES_ID = '*';

interface Props {
  spaceIds: string[];
  jobId: string;
  jobType: JobType;
  refresh(): void;
}

function filterUnknownSpaces(ids: string[]) {
  return ids.filter((id) => id !== '?');
}

export const JobSpacesList: FC<Props> = ({ spaceIds, jobId, jobType, refresh }) => {
  const { allSpaces } = useSpacesContext();

  const [showFlyout, setShowFlyout] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    const tempSpaces = spaceIds.includes(ALL_SPACES_ID)
      ? [{ id: ALL_SPACES_ID, name: ALL_SPACES_ID, disabledFeatures: [], color: '#DDD' }]
      : allSpaces.filter((s) => spaceIds.includes(s.id));
    setSpaces(tempSpaces);
  }, [spaceIds, allSpaces]);

  function onClose() {
    setShowFlyout(false);
    refresh();
  }

  return (
    <>
      <EuiButtonEmpty onClick={() => setShowFlyout(true)} style={{ height: 'auto' }}>
        <EuiFlexGroup wrap responsive={false} gutterSize="xs">
          {spaces.map((space) => (
            <EuiFlexItem grow={false} key={space.id}>
              <SpaceAvatar space={space} size={'s'} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiButtonEmpty>
      {showFlyout && (
        <JobSpacesFlyout
          jobId={jobId}
          spaceIds={filterUnknownSpaces(spaceIds)}
          jobType={jobType}
          onClose={onClose}
        />
      )}
    </>
  );
};
