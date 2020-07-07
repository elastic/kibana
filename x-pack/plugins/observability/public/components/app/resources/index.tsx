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
    href: 'https://www.elastic.co/guide/en/observability/current/observability-ui.html',
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
      defaultMessage: 'Observability fundamentals',
    }),
    href: 'https://www.elastic.co/training/observability-fundamentals',
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
