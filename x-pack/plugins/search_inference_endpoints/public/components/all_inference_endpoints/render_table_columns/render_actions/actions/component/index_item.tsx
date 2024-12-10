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
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { ENTERPRISE_SEARCH_CONTENT_APP_ID } from '@kbn/deeplinks-search';

import { SEARCH_INDICES } from '@kbn/deeplinks-search/constants';

import { useKibana } from '../../../../../../hooks/use_kibana';
import { InferenceUsageInfo } from '../../../../types';
import { SERVERLESS_INDEX_MANAGEMENT_URL } from '../../../../constants';

interface UsageProps {
  usageItem: InferenceUsageInfo;
}
export const IndexItem: React.FC<UsageProps> = ({ usageItem }) => {
  const {
    services: { application, serverless },
  } = useKibana();
  const navigateToIndex = useCallback(() => {
    if (serverless) {
      application?.navigateToApp(SEARCH_INDICES, {
        path: `${SERVERLESS_INDEX_MANAGEMENT_URL}/${usageItem.id}/data`,
        openInNewTab: true,
      });
    } else {
      application?.navigateToApp(ENTERPRISE_SEARCH_CONTENT_APP_ID, {
        path: `search_indices/${usageItem.id}`,
        openInNewTab: true,
      });
    }
  }, [application, serverless, usageItem.id]);

  return (
    <EuiFlexGroup gutterSize="s" direction="column" data-test-subj="usageItem">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiTextTruncate text={usageItem.id} />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{usageItem.type}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink data-test-subj="navigateToIndexPage" onClick={navigateToIndex}>
              <EuiIcon size="s" type="popout" />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="s" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
