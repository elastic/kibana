/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Space, SpacesApiUi } from '@kbn/spaces-plugin/public';

import type { RoleKibanaPrivilege } from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';
import { SpacesPopoverList } from '../../../spaces_popover_list';

export interface SpaceColumnHeaderProps {
  spaces: Space[];
  entry: RoleKibanaPrivilege;
  spacesApiUi: SpacesApiUi;
}

const SPACES_DISPLAY_COUNT = 4;

export const SpaceColumnHeader = (props: SpaceColumnHeaderProps) => {
  const { spacesApiUi } = props;
  const isGlobal = isGlobalPrivilegeDefinition(props.entry);
  const entrySpaces = props.entry.spaces.map((spaceId) => {
    return (
      props.spaces.find((s) => s.id === spaceId) ?? {
        id: spaceId,
        name: spaceId,
        disabledFeatures: [],
      }
    );
  });
  const LazySpaceAvatar = useMemo(() => spacesApiUi.components.getSpaceAvatar, [spacesApiUi]);

  return (
    <div>
      {entrySpaces.slice(0, SPACES_DISPLAY_COUNT).map((space) => {
        return (
          <span key={space.id}>
            <LazySpaceAvatar size="s" space={space} />{' '}
            {isGlobal && (
              <span>
                <FormattedMessage
                  id="xpack.security.management.editRole.spacePrivilegeMatrix.globalSpaceName"
                  defaultMessage="All Spaces"
                />
              </span>
            )}
          </span>
        );
      })}
      {entrySpaces.length > SPACES_DISPLAY_COUNT && (
        <Fragment>
          <br />
          <SpacesPopoverList
            spaces={entrySpaces}
            buttonText={i18n.translate(
              'xpack.security.management.editRole.spacePrivilegeMatrix.showNMoreSpacesLink',
              {
                defaultMessage: '+{count} more',
                values: {
                  count: entrySpaces.length - SPACES_DISPLAY_COUNT,
                },
              }
            )}
            spacesApiUi={spacesApiUi}
          />
        </Fragment>
      )}
    </div>
  );
};
