/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { CategoryUserAction } from '../../../common/api';
import type { UserActionBuilder, UserActionResponse } from './types';

import { Actions } from '../../../common/api';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';

const getLabelTitle = (userAction: UserActionResponse<CategoryUserAction>) => {
  const category = userAction.payload.category ?? '';
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      data-test-subj={`${userAction.id}-user-action`}
      responsive={false}
    >
      {userAction.action === Actions.update ? (
        <EuiFlexItem grow={false}>{`${i18n.ADD_CATEGORY} "${category}"`}</EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false}>{i18n.REMOVE_CATEGORY}</EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const createCategoryUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const categoryUserAction = userAction as UserActionResponse<CategoryUserAction>;
    const label = getLabelTitle(categoryUserAction);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});
