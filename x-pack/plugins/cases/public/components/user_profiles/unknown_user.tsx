/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { UserAvatar } from '@kbn/user-profile-components';
import * as i18n from '../../common/translations';

const CaseUnknownUserAvatarComponent: React.FC = () => {
  return (
    <UserAvatar
      user={{ username: '', display_name: i18n.UNKNOWN }}
      avatar={{ initials: 'U' }}
      data-test-subj="case-user-profile-avatar-unknown-user"
    />
  );
};
CaseUnknownUserAvatarComponent.displayName = 'UnknownUserAvatar';

export const CaseUnknownUserAvatar = React.memo(CaseUnknownUserAvatarComponent);
