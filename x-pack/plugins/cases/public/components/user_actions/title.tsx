/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TitleUserAction } from '../../../common/api';
import { UserActionBuilder, UserActionResponse } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';

const getLabelTitle = (userAction: UserActionResponse<TitleUserAction>) =>
  `${i18n.CHANGED_FIELD.toLowerCase()} ${i18n.CASE_NAME.toLowerCase()} ${i18n.TO} "${
    userAction.payload.title
  }"`;

export const createTitleUserActionBuilder: UserActionBuilder = ({
  userAction,
  handleOutlineComment,
}) => ({
  build: () => {
    const titleUserAction = userAction as UserActionResponse<TitleUserAction>;
    const label = getLabelTitle(titleUserAction);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});
