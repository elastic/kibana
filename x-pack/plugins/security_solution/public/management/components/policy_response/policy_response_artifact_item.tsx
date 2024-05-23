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
import type { HostPolicyResponseAppliedArtifact } from '../../../../common/endpoint/types';

const StyledArtifactName = styled(EuiText)`
  white-space: nowrap;
  text-align: left;
  line-height: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledShaValue = styled(EuiText)`
  //font-family: monospace;
  //color: #333; /* Adjust as needed */
  white-space: nowrap;
  text-align: right;
  line-height: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
`;

interface PolicyResponseArtifactItemProps {
  artifact: HostPolicyResponseAppliedArtifact;
}

/**
 * A policy response action item
 */
export const PolicyResponseArtifactItem = memo(({ artifact }: PolicyResponseArtifactItemProps) => {
  return (
    <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <StyledArtifactName data-test-subj="endpointPolicyResponseArtifactName">
          {artifact.name}
        </StyledArtifactName>
      </EuiFlexItem>
      <EuiFlexItem grow={true} style={{ maxWidth: '60%' }}>
        <StyledShaValue data-test-subj="endpointPolicyResponseArtifactSha256">
          {truncate(artifact.sha256, { length: 12 })}
        </StyledShaValue>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCopy textToCopy={artifact.sha256}>
          {(copy) => (
            <EuiToolTip position="top" content="Copy artifact id" display="block">
              <EuiButtonEmpty
                size="xs"
                flush="right"
                iconType="copyClipboard"
                onClick={copy}
                data-test-subj="vegaDataInspectorCopyClipboardButton"
              />
            </EuiToolTip>
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

PolicyResponseArtifactItem.displayName = 'PolicyResponseArtifactItem';
