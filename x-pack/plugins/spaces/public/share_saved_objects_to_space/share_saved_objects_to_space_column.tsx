/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  SavedObjectsManagementColumn,
  SavedObjectsManagementRecord,
} from '../../../../../src/plugins/saved_objects_management/public';
import { SpaceTarget } from './types';
import { SpacesManager } from '../spaces_manager';
import { getSpaceColor } from '..';

const SPACES_DISPLAY_COUNT = 5;

type SpaceMap = Map<string, SpaceTarget>;
interface ColumnDataProps {
  namespaces?: string[];
  data?: SpaceMap;
}

const ColumnDisplay = ({ namespaces, data }: ColumnDataProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data) {
    return null;
  }

  const authorized = namespaces?.filter((namespace) => namespace !== '?') ?? [];
  const authorizedSpaceTargets: SpaceTarget[] = [];
  authorized.forEach((namespace) => {
    const spaceTarget = data.get(namespace);
    if (spaceTarget === undefined) {
      // in the event that a new space was created after this page has loaded, fall back to displaying the space ID
      authorizedSpaceTargets.push({
        id: namespace,
        name: namespace,
        disabledFeatures: [],
        isActiveSpace: false,
      });
    } else if (!spaceTarget.isActiveSpace) {
      authorizedSpaceTargets.push(spaceTarget);
    }
  });
  const unauthorizedCount = (namespaces?.filter((namespace) => namespace === '?') ?? []).length;
  const unauthorizedTooltip = i18n.translate(
    'xpack.spaces.management.shareToSpace.columnUnauthorizedLabel',
    { defaultMessage: 'You do not have permission to view these spaces' }
  );

  const displayedSpaces = isExpanded
    ? authorizedSpaceTargets
    : authorizedSpaceTargets.slice(0, SPACES_DISPLAY_COUNT);
  const showButton = authorizedSpaceTargets.length > SPACES_DISPLAY_COUNT;

  const unauthorizedCountBadge =
    (isExpanded || !showButton) && unauthorizedCount > 0 ? (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={unauthorizedTooltip}>
          <EuiBadge color="#DDD">+{unauthorizedCount}</EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    ) : null;

  let button: ReactNode = null;
  if (showButton) {
    button = isExpanded ? (
      <EuiButtonEmpty size="xs" onClick={() => setIsExpanded(false)}>
        <FormattedMessage
          id="xpack.spaces.management.shareToSpace.showLessSpacesLink"
          defaultMessage="show less"
        />
      </EuiButtonEmpty>
    ) : (
      <EuiButtonEmpty size="xs" onClick={() => setIsExpanded(true)}>
        <FormattedMessage
          id="xpack.spaces.management.shareToSpace.showMoreSpacesLink"
          defaultMessage="+{count} more"
          values={{
            count: authorizedSpaceTargets.length + unauthorizedCount - displayedSpaces.length,
          }}
        />
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiFlexGroup wrap responsive={false} gutterSize="xs">
      {displayedSpaces.map(({ id, name, color }) => (
        <EuiFlexItem grow={false} key={id}>
          <EuiBadge color={color || 'hollow'}>{name}</EuiBadge>
        </EuiFlexItem>
      ))}
      {unauthorizedCountBadge}
      {button}
    </EuiFlexGroup>
  );
};

export class ShareToSpaceSavedObjectsManagementColumn
  implements SavedObjectsManagementColumn<SpaceMap> {
  public id: string = 'share_saved_objects_to_space';
  public data: Map<string, SpaceTarget> | undefined;

  public euiColumn = {
    field: 'namespaces',
    name: i18n.translate('xpack.spaces.management.shareToSpace.columnTitle', {
      defaultMessage: 'Shared spaces',
    }),
    description: i18n.translate('xpack.spaces.management.shareToSpace.columnDescription', {
      defaultMessage: 'The other spaces that this object is currently shared to',
    }),
    render: (namespaces: string[] | undefined, _object: SavedObjectsManagementRecord) => (
      <ColumnDisplay namespaces={namespaces} data={this.data} />
    ),
  };

  constructor(private readonly spacesManager: SpacesManager) {}

  public loadData = () => {
    this.data = undefined;
    return Promise.all([this.spacesManager.getSpaces(), this.spacesManager.getActiveSpace()]).then(
      ([spaces, activeSpace]) => {
        this.data = spaces
          .map<SpaceTarget>((space) => ({
            ...space,
            isActiveSpace: space.id === activeSpace.id,
            color: getSpaceColor(space),
          }))
          .reduce((acc, cur) => acc.set(cur.id, cur), new Map<string, SpaceTarget>());
        return this.data;
      }
    );
  };
}
