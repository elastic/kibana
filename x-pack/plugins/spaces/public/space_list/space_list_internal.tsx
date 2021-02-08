/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, ReactNode, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import type { SpaceListProps } from '../../../../../src/plugins/spaces_oss/public';
import { SpacesData, SpaceData } from '../types';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../common/constants';
import { useSpaces } from '../spaces_context';
import { SpaceAvatar } from '../space_avatar';

const DEFAULT_DISPLAY_LIMIT = 5;

export const SpaceListInternal = ({
  namespaces,
  displayLimit = DEFAULT_DISPLAY_LIMIT,
  enableSpaceAgnosticBehavior,
}: SpaceListProps) => {
  const { spacesDataPromise } = useSpaces();

  const [isExpanded, setIsExpanded] = useState(false);
  const [spacesData, setSpacesData] = useState<SpacesData>();

  useEffect(() => {
    spacesDataPromise.then((x) => {
      setSpacesData(x);
    });
  }, [spacesDataPromise]);

  if (!spacesData) {
    return null;
  }

  const isSharedToAllSpaces = namespaces?.includes(ALL_SPACES_ID);
  const unauthorizedCount = (namespaces?.filter((namespace) => namespace === UNKNOWN_SPACE) ?? [])
    .length;
  let displayedSpaces: SpaceData[];
  let button: ReactNode = null;

  if (isSharedToAllSpaces) {
    displayedSpaces = [
      {
        id: ALL_SPACES_ID,
        name: i18n.translate('xpack.spaces.spaceList.allSpacesLabel', {
          defaultMessage: `* All spaces`,
        }),
        initials: '*',
        color: '#D3DAE6',
      },
    ];
  } else {
    const authorized = namespaces?.filter((namespace) => namespace !== UNKNOWN_SPACE) ?? [];
    const enabledSpaceTargets: SpaceData[] = [];
    const disabledSpaceTargets: SpaceData[] = [];
    authorized.forEach((namespace) => {
      const spaceTarget = spacesData.spacesMap.get(namespace);
      if (spaceTarget === undefined) {
        // in the event that a new space was created after this page has loaded, fall back to displaying the space ID
        enabledSpaceTargets.push({ id: namespace, name: namespace });
      } else if (enableSpaceAgnosticBehavior || !spaceTarget.isActiveSpace) {
        if (spaceTarget.isFeatureDisabled) {
          disabledSpaceTargets.push(spaceTarget);
        } else {
          enabledSpaceTargets.push(spaceTarget);
        }
      }
    });
    const authorizedSpaceTargets = [...enabledSpaceTargets, ...disabledSpaceTargets];

    displayedSpaces =
      isExpanded || !displayLimit
        ? authorizedSpaceTargets
        : authorizedSpaceTargets.slice(0, displayLimit);

    if (displayLimit && authorizedSpaceTargets.length > displayLimit) {
      button = isExpanded ? (
        <EuiButtonEmpty size="xs" onClick={() => setIsExpanded(false)}>
          <FormattedMessage
            id="xpack.spaces.spaceList.showLessSpacesLink"
            defaultMessage="show less"
          />
        </EuiButtonEmpty>
      ) : (
        <EuiButtonEmpty size="xs" onClick={() => setIsExpanded(true)}>
          <FormattedMessage
            id="xpack.spaces.spaceList.showMoreSpacesLink"
            defaultMessage="+{count} more"
            values={{
              count: authorizedSpaceTargets.length + unauthorizedCount - displayedSpaces.length,
            }}
          />
        </EuiButtonEmpty>
      );
    }
  }

  const unauthorizedCountBadge =
    !isSharedToAllSpaces && (isExpanded || button === null) && unauthorizedCount > 0 ? (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            <FormattedMessage
              id="xpack.spaces.spaceList.unauthorizedCountLabel"
              defaultMessage="You don't have permission to view these spaces."
            />
          }
        >
          <EuiBadge color="#DDD">+{unauthorizedCount}</EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    ) : null;

  return (
    <EuiFlexGroup wrap responsive={false} gutterSize="xs">
      {displayedSpaces.map((space) => {
        const color = space.isFeatureDisabled ? 'hollow' : space.color;
        return (
          <EuiFlexItem grow={false} key={space.id}>
            <SpaceAvatar space={{ ...space, color }} size={'s'} />
          </EuiFlexItem>
        );
      })}
      {unauthorizedCountBadge}
      {button}
    </EuiFlexGroup>
  );
};
