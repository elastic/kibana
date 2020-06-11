/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiButtonEmpty,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { APMLink } from '../../Links/apm/APMLink';

export const ManageCustomLink = ({
  onCreateCustomLinkClick,
  showCreateCustomLinkButton = true,
}: {
  onCreateCustomLinkClick: () => void;
  showCreateCustomLinkButton?: boolean;
}) => (
  <EuiFlexGroup>
    <EuiFlexItem>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
        <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
          <EuiToolTip
            position="top"
            content={i18n.translate('xpack.apm.customLink.buttom.manage', {
              defaultMessage: 'Manage custom links',
            })}
          >
            <APMLink path={`/settings/customize-ui`}>
              <EuiIcon
                type="gear"
                color="text"
                aria-label="Custom links settings page"
              />
            </APMLink>
          </EuiToolTip>
        </EuiFlexItem>
        {showCreateCustomLinkButton && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="plusInCircle"
              size="xs"
              onClick={onCreateCustomLinkClick}
            >
              {i18n.translate('xpack.apm.customLink.buttom.create.title', {
                defaultMessage: 'Create',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);
