/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { Actions, TagsUserAction } from '../../../common/api';
import { UserActionBuilder, UserActionResponse } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import { Tags } from '../tag_list/tags';
import * as i18n from './translations';

const getLabelTitle = (userAction: UserActionResponse<TagsUserAction>) => {
  const tags = userAction.payload.tags ?? [];

  return (
    <EuiFlexGroup alignItems="baseline" gutterSize="xs" component="span" responsive={false}>
      <EuiFlexItem data-test-subj="ua-tags-label" grow={false}>
        {userAction.action === Actions.add && i18n.ADDED_FIELD}
        {userAction.action === Actions.delete && i18n.REMOVED_FIELD} {i18n.TAGS.toLowerCase()}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Tags tags={tags} gutterSize="xs" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const createTagsUserActionBuilder: UserActionBuilder = ({
  userAction,
  handleOutlineComment,
}) => ({
  build: () => {
    const tagsUserAction = userAction as UserActionResponse<TagsUserAction>;
    const label = getLabelTitle(tagsUserAction);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      handleOutlineComment,
      label,
      icon: 'tag',
    });

    return commonBuilder.build();
  },
});
