/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiListGroup, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const resources = [
  {
    iconType: 'documents',
    label: i18n.translate('xpack.observability.resources.documentation', {
      defaultMessage: 'Documentation',
    }),
    // TODO: caue what's the url?
    href: 'https://www.elastic.co',
  },
  {
    iconType: 'editorComment',
    label: i18n.translate('xpack.observability.resources.forum', {
      defaultMessage: 'Discuss forum',
    }),
    href: 'https://discuss.elastic.co/c/observability/',
  },
  {
    iconType: 'training',
    label: i18n.translate('xpack.observability.resources.training', {
      defaultMessage: 'Training and webinars',
    }),
    // TODO: caue what's the url?
    href: 'https://www.elastic.co',
  },
];

export const Resources = () => {
  return (
    <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h4>
            {i18n.translate('xpack.observability.resources.title', {
              defaultMessage: 'Resources',
            })}
          </h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiListGroup flush listItems={resources} data-test-subj="list-group" />
    </EuiFlexGroup>
  );
};
