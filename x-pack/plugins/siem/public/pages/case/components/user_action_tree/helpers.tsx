/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiLink } from '@elastic/eui';
import React from 'react';

import { CaseFullExternalService } from '../../../../../../case/common/api';
import { CaseUserActions } from '../../../../containers/case/types';
import * as i18n from '../case_view/translations';

interface LabelTitle {
  action: CaseUserActions;
  field: string;
  firstIndexPushToService: number;
  index: number;
}

export const getLabelTitle = ({ action, field, firstIndexPushToService, index }: LabelTitle) => {
  if (field === 'tags') {
    return getTagsLabelTitle(action);
  } else if (field === 'title' && action.action === 'update') {
    return `${i18n.CHANGED_FIELD.toLowerCase()} ${i18n.CASE_NAME.toLowerCase()}  ${i18n.TO} "${
      action.newValue
    }"`;
  } else if (field === 'description' && action.action === 'update') {
    return `${i18n.EDITED_FIELD} ${i18n.DESCRIPTION.toLowerCase()}`;
  } else if (field === 'status' && action.action === 'update') {
    return `${
      action.newValue === 'open' ? i18n.REOPENED_CASE.toLowerCase() : i18n.CLOSED_CASE.toLowerCase()
    } ${i18n.CASE}`;
  } else if (field === 'comment' && action.action === 'update') {
    return `${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`;
  } else if (field === 'pushed' && action.action === 'push-to-service' && action.newValue != null) {
    return getPushedServiceLabelTitle(action, firstIndexPushToService, index);
  }
  return '';
};

const getTagsLabelTitle = (action: CaseUserActions) => (
  <EuiFlexGroup alignItems="baseline" gutterSize="xs" component="span">
    <EuiFlexItem data-test-subj="ua-tags-label">
      {action.action === 'add' && i18n.ADDED_FIELD}
      {action.action === 'delete' && i18n.REMOVED_FIELD} {i18n.TAGS.toLowerCase()}
    </EuiFlexItem>
    {action.newValue != null &&
      action.newValue.split(',').map(tag => (
        <EuiFlexItem grow={false} key={tag}>
          <EuiBadge data-test-subj={`ua-tag`} color="default">
            {tag}
          </EuiBadge>
        </EuiFlexItem>
      ))}
  </EuiFlexGroup>
);

const getPushedServiceLabelTitle = (
  action: CaseUserActions,
  firstIndexPushToService: number,
  index: number
) => {
  const pushedVal = JSON.parse(action.newValue ?? '') as CaseFullExternalService;
  return (
    <EuiFlexGroup alignItems="baseline" gutterSize="xs" data-test-subj="pushed-service-label-title">
      <EuiFlexItem data-test-subj="pushed-label">
        {firstIndexPushToService === index ? i18n.PUSHED_NEW_INCIDENT : i18n.UPDATE_INCIDENT}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="pushed-value" href={pushedVal?.external_url} target="_blank">
          {pushedVal?.connector_name} {pushedVal?.external_title}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
