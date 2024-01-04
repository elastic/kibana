/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { lazy, Suspense, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SpaceListProps } from './types';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../common/constants';
import { APPEND_ACTIVE_SPACE } from '../share_saved_objects_to_space/components/selectable_spaces_control';
import { getSpaceAvatarComponent } from '../space_avatar';
import { useSpaces } from '../spaces_context';
import type { SpacesData, SpacesDataEntry } from '../types';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

const DEFAULT_DISPLAY_LIMIT = 5;
type SpaceTarget = Omit<SpacesDataEntry, 'isAuthorizedForPurpose'>;

/**
 * Displays a corresponding list of spaces for a given list of saved object namespaces. It shows up to five spaces (and an indicator for any
 * number of spaces that the user is not authorized to see) by default. If more than five named spaces would be displayed, the extras (along
 * with the unauthorized spaces indicator, if present) are hidden behind a button. If '*' (aka "All spaces") is present, it supersedes all
 * of the above and just displays a single badge without a button.
 */
export const SpaceListInternal = ({
  namespaces,
  displayLimit = DEFAULT_DISPLAY_LIMIT,
  behaviorContext,
  listOnClick = () => {},
  cursorStyle,
  direction = 'horizontal',
}: SpaceListProps) => {
  const { spacesDataPromise } = useSpaces();

  const [isExpanded, setIsExpanded] = useState(false);
  const [shareToSpacesData, setShareToSpacesData] = useState<SpacesData>();

  useEffect(() => {
    spacesDataPromise.then((x) => {
      setShareToSpacesData(x);
    });
  }, [spacesDataPromise]);

  if (!shareToSpacesData) {
    return null;
  }

  const getMoreSpacesLabel = (count: number) => (
    <FormattedMessage
      id="xpack.spaces.spaceList.showMoreSpacesLink"
      defaultMessage="+{count} more"
      values={{
        count,
      }}
    />
  );

  const isSharedToAllSpaces = namespaces.includes(ALL_SPACES_ID);
  const unauthorizedSpacesCount = namespaces.filter(
    (namespace) => namespace === UNKNOWN_SPACE
  ).length;
  let displayedSpaces: SpaceTarget[];
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
    const authorized = namespaces.filter((namespace) => namespace !== UNKNOWN_SPACE);
    const enabledSpaceTargets: SpaceTarget[] = [];
    const disabledSpaceTargets: SpaceTarget[] = [];
    authorized.forEach((namespace) => {
      const spaceTarget = shareToSpacesData.spacesMap.get(namespace);
      if (spaceTarget === undefined) {
        // in the event that a new space was created after this page has loaded, fall back to displaying the space ID
        enabledSpaceTargets.push({ id: namespace, name: namespace });
      } else if (behaviorContext === 'outside-space' || !spaceTarget.isActiveSpace) {
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
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size={direction === 'horizontal' ? 'xs' : 's'}
            onClick={() => setIsExpanded(false)}
            style={{ alignSelf: 'center' }}
          >
            <FormattedMessage
              id="xpack.spaces.spaceList.showLessSpacesLink"
              defaultMessage="Show less"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size={direction === 'horizontal' ? 'xs' : 's'}
            onClick={() => setIsExpanded(true)}
            style={{ alignSelf: 'center' }}
          >
            {getMoreSpacesLabel(
              authorizedSpaceTargets.length + unauthorizedSpacesCount - displayedSpaces.length
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      );
    }
  }

  const unauthorizedSpacesCountBadge =
    !isSharedToAllSpaces && (isExpanded || button === null) && unauthorizedSpacesCount > 0 ? (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            <FormattedMessage
              id="xpack.spaces.spaceList.unauthorizedSpacesCountLabel"
              defaultMessage="You don't have permission to view these spaces."
            />
          }
        >
          <EuiBadge color="#DDD">{getMoreSpacesLabel(unauthorizedSpacesCount)}</EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    ) : null;
  const styleProps = {
    style: cursorStyle ? { cursor: cursorStyle } : undefined,
  };

  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <EuiFlexGroup
        wrap
        responsive={false}
        gutterSize="s"
        direction={direction === 'horizontal' ? 'row' : 'column'}
        alignItems="flexStart"
      >
        {displayedSpaces.map((space) => {
          const isDisabled = space.isFeatureDisabled;
          return (
            <EuiFlexItem grow={false} key={space.id}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <LazySpaceAvatar
                    space={space}
                    isDisabled={isDisabled}
                    size={'s'}
                    onClick={listOnClick}
                    onKeyPress={listOnClick}
                    {...styleProps}
                  />
                </EuiFlexItem>
                {direction === 'vertical' ? (
                  <>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">{space.name}</EuiText>
                    </EuiFlexItem>
                    {space.isActiveSpace ? <EuiFlexItem>{APPEND_ACTIVE_SPACE}</EuiFlexItem> : null}
                  </>
                ) : null}
              </EuiFlexGroup>
            </EuiFlexItem>
          );
        })}
        {unauthorizedSpacesCountBadge}
        {button}
      </EuiFlexGroup>
    </Suspense>
  );
};
