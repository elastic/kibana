/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { truncate } from 'lodash';
import styled from 'styled-components';
import {
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HostPolicyResponseAppliedArtifact } from '../../../../common/endpoint/types';

const StyledArtifactName = styled(EuiText)`
  white-space: nowrap;
  line-height: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledShaValue = styled(EuiText)`
  width: 80px;
  white-space: nowrap;
  line-height: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const IconContainer = styled(EuiText)`
  padding: 2px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

interface PolicyResponseArtifactItemProps {
  artifact: HostPolicyResponseAppliedArtifact;
}

const COPY_TOOLTIP = {
  BEFORE: i18n.translate(
    'xpack.securitySolution.endpoint.details.policyResponse.artifact.copyButton.beforeCopyTooltip',
    {
      defaultMessage: 'Copy artifact ID',
    }
  ),
  AFTER: i18n.translate(
    'xpack.securitySolution.endpoint.details.policyResponse.artifact.copyButton.afterCopyTooltip',
    {
      defaultMessage: 'Artifact ID copied!',
    }
  ),
};

export const PolicyResponseArtifactItem = memo(({ artifact }: PolicyResponseArtifactItemProps) => {
  return (
    <EuiFlexGroup direction="row" alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem grow={true} style={{ alignItems: 'flex-start' }}>
        <StyledArtifactName data-test-subj="endpointPolicyResponseArtifactName">
          {artifact.name}
        </StyledArtifactName>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" alignItems="center" justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <IconContainer size={'xs'}>{'sha256'}</IconContainer>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StyledShaValue data-test-subj="endpointPolicyResponseArtifactSha256">
              <EuiToolTip position="top" content={artifact.sha256}>
                <>{truncate(artifact.sha256, { length: 12 })}</>
              </EuiToolTip>
            </StyledShaValue>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy
              textToCopy={artifact.sha256}
              beforeMessage={COPY_TOOLTIP.BEFORE}
              afterMessage={COPY_TOOLTIP.AFTER}
            >
              {(copy) => (
                <EuiButtonEmpty
                  size="m"
                  flush="right"
                  iconType="copyClipboard"
                  onClick={copy}
                  data-test-subj="vegaDataInspectorCopyClipboardButton"
                />
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

PolicyResponseArtifactItem.displayName = 'PolicyResponseArtifactItem';
