/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { datasetQualityAppTitle } from '../../../common/translations';

export const betaBadgeLabel = i18n.translate('xpack.datasetQuality.betaBadgeLabel', {
  defaultMessage: 'Beta',
});

export const betaBadgeDescription = i18n.translate('xpack.datasetQuality.betaBadgeDescription', {
  defaultMessage:
    'This feature is currently in beta. If you encounter any bugs or have feedback, we’d love to hear from you. Please open a support issue and/or visit our discussion forum.',
});

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function Header() {
  return (
    <EuiPageHeader bottomBorder>
      <EuiPageHeaderSection>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiText>
            <h2>{datasetQualityAppTitle}</h2>
          </EuiText>
          <EuiFlexItem>
            <EuiBetaBadge
              label={betaBadgeLabel}
              title={betaBadgeLabel}
              tooltipContent={betaBadgeDescription}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeaderSection>
    </EuiPageHeader>
  );
}
