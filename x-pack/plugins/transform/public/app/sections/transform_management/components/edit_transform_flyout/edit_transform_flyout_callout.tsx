/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiTextColor,
} from '@elastic/eui';

import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';
export const EditTransformFlyoutCallout: FC = () => {
  const { esTransformUpdate } = useDocumentationLinks();

  return (
    <EuiCallOut>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiIcon type="help" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTextColor color="subdued">
            {i18n.translate('xpack.transform.transformList.editFlyoutCalloutText', {
              defaultMessage:
                'This form allows you to update a transform. The list of properties that you can update is a subset of the list that you can define when you create a transform.',
            })}
          </EuiTextColor>
          <EuiLink href={esTransformUpdate} target="_BLANK">
            {i18n.translate('xpack.transform.transformList.editFlyoutCalloutDocs', {
              defaultMessage: 'View docs',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
