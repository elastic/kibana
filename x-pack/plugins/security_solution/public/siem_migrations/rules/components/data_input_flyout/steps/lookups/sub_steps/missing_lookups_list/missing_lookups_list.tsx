/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import * as i18n from './translations';

const scrollPanelCss = css`
  max-height: 200px;
  overflow-y: auto;
`;

interface MissingLookupsListProps {
  missingLookups: string[];
  uploadedLookups: Record<string, true>;
  onCopied: () => void;
}
export const MissingLookupsList = React.memo<MissingLookupsListProps>(
  ({ missingLookups, uploadedLookups, onCopied }) => {
    return (
      <>
        <EuiPanel hasShadow={false} hasBorder className={scrollPanelCss}>
          <EuiFlexGroup direction="column" gutterSize="s">
            {missingLookups.map((lookupName) => {
              return (
                <EuiFlexItem key={lookupName}>
                  <EuiFlexGroup
                    direction="row"
                    gutterSize="s"
                    alignItems="center"
                    justifyContent="flexStart"
                  >
                    <EuiFlexItem grow={false}>
                      {uploadedLookups[lookupName] ? (
                        <EuiIcon type="checkInCircleFilled" color="success" />
                      ) : (
                        <EuiIcon type="dot" />
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">{lookupName}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiCopy textToCopy={lookupName}>
                        {(copy) => (
                          <CopyButton lookupName={lookupName} onCopied={onCopied} copy={copy} />
                        )}
                      </EuiCopy>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.MISSING_LOOKUPS_DESCRIPTION}
        </EuiText>
      </>
    );
  }
);
MissingLookupsList.displayName = 'MissingLookupsList';

interface CopyButtonProps {
  lookupName: string;
  onCopied: () => void;
  copy: () => void;
}
const CopyButton = React.memo<CopyButtonProps>(({ lookupName, onCopied, copy }) => {
  const onClick = useCallback(() => {
    copy();
    onCopied();
  }, [copy, onCopied]);
  return (
    <EuiButtonIcon
      onClick={onClick}
      iconType="copyClipboard"
      color="text"
      aria-label={lookupName}
      data-test-subj="lookupNameCopy"
    />
  );
});
CopyButton.displayName = 'CopyButton';
