/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
  EuiTextTruncate,
  EuiIcon,
} from '@elastic/eui';
import React from 'react';

import { useKibana } from '../../../../../../hooks/use_kibana';
import { InferenceUsageInfo } from '../../../../types';

interface UsageProps {
  usageItem: InferenceUsageInfo;
}
export const UsageItem: React.FC<UsageProps> = ({ usageItem }) => {
  const {
    services: { application },
  } = useKibana();
  const handleNavigateToIndex = () => {
    if (usageItem.type === 'Index') {
      application?.navigateToApp('enterprise_search', {
        path: `content/search_indices/${usageItem.label}`,
        openInNewTab: true,
      });
    } else if (usageItem.type === 'Pipeline') {
      application?.navigateToApp('management', {
        path: `ingest/ingest_pipelines?pipeline=${usageItem.label}`,
        openInNewTab: true,
      });
    }
  };

  return (
    <EuiFlexGroup gutterSize="xs" direction="column" data-test-subj="usageItem">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiTextTruncate text={usageItem.label} />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{usageItem.type}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink onClick={handleNavigateToIndex}>
              <EuiIcon size="s" type="popout" />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
