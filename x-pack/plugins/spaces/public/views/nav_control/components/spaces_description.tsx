/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuPanel, EuiText } from '@elastic/eui';
import React, { SFC } from 'react';
import { UserProfile } from '../../../../../xpack_main/public/services/user_profile';
import { ManageSpacesButton } from '../../../components';
import { SPACES_FEATURE_DESCRIPTION } from '../../../lib/constants';
import './spaces_description.less';

interface Props {
  userProfile: UserProfile;
  onManageSpacesClick: () => void;
}

export const SpacesDescription: SFC<Props> = (props: Props) => {
  const panelProps = {
    className: 'spacesDescription',
    title: 'Spaces',
  };

  return (
    <EuiContextMenuPanel {...panelProps}>
      <EuiText className="spacesDescription__text">
        <p>{SPACES_FEATURE_DESCRIPTION}</p>
      </EuiText>
      <div key="manageSpacesButton" className="spacesDescription__manageButtonWrapper">
        <ManageSpacesButton
          size="s"
          style={{ width: `100%` }}
          userProfile={props.userProfile}
          onClick={props.onManageSpacesClick}
        />
      </div>
    </EuiContextMenuPanel>
  );
};
