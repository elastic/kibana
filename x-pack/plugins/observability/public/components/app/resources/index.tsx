/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const resources = [
  {
    id: 'documentation',
    icon: 'documents',
    name: i18n.translate('xpack.observability.resources.documentation', {
      defaultMessage: 'Documentation',
    }),
    // TODO: caue what's the url?
    href: 'https://www.elastic.co',
  },
  {
    id: 'forum',
    icon: 'editorComment',
    name: i18n.translate('xpack.observability.resources.forum', {
      defaultMessage: 'Discuss forum',
    }),
    // TODO: caue what's the url?
    href: 'https://www.elastic.co',
  },
  {
    id: 'training',
    icon: 'training',
    name: i18n.translate('xpack.observability.resources.training', {
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
        <EuiText size="s">
          <h4>
            {i18n.translate('xpack.observability.resources.title', {
              defaultMessage: 'Resources',
            })}
          </h4>
        </EuiText>
      </EuiFlexItem>
      {resources.map((resource) => (
        <EuiFlexItem key={resource.id} grow={false}>
          <EuiButtonEmpty
            href={resource.href}
            iconType={resource.icon}
            data-test-subj={`button-${resource.id}`}
          >
            <EuiText size="s">{resource.name}</EuiText>
          </EuiButtonEmpty>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
