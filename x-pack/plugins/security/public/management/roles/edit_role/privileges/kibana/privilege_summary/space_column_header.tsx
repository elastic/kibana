/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Space, SpaceAvatar } from '../../../../../../../../spaces/public';
import { RoleKibanaPrivilege } from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';
import { SpacesPopoverList } from '../../../spaces_popover_list';

interface Props {
  spaces: Space[];
  entry: RoleKibanaPrivilege;
}

const SPACES_DISPLAY_COUNT = 4;

export const SpaceColumnHeader = (props: Props) => {
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
  return (
    <div>
      {entrySpaces.slice(0, SPACES_DISPLAY_COUNT).map((space) => {
        return (
          <span key={space.id}>
            <SpaceAvatar size="s" space={space} />{' '}
            {isGlobal && (
              <span>
                <FormattedMessage
                  id="xpack.security.management.editRole.spacePrivilegeMatrix.globalSpaceName"
                  defaultMessage="Global"
                />
                <br />
                <SpacesPopoverList
                  spaces={props.spaces.filter((s) => s.id !== '*')}
                  buttonText={i18n.translate(
                    'xpack.security.management.editRole.spacePrivilegeMatrix.showAllSpacesLink',
                    {
                      defaultMessage: '(all spaces)',
                    }
                  )}
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
          />
        </Fragment>
      )}
    </div>
  );
};
