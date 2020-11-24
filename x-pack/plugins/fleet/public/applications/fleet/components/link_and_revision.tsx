/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { CSSProperties, memo } from 'react';
import { EuiLinkProps } from '@elastic/eui/src/components/link/link';

const MIN_WIDTH: CSSProperties = { minWidth: 0 };
const NO_WRAP_WHITE_SPACE: CSSProperties = { whiteSpace: 'nowrap' };

export type LinkAndRevisionProps = EuiLinkProps & {
  revision?: string | number;
};

/**
 * Components shows a link for a given value along with a revision number to its right. The display
 * value is truncated if it is longer than the width of where it is displayed, while the revision
 * always remain visible
 */
export const LinkAndRevision = memo<LinkAndRevisionProps>(
  ({ revision, className, ...euiLinkProps }) => {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="baseline" style={MIN_WIDTH} responsive={false}>
        <EuiFlexItem grow={false} className="eui-textTruncate">
          <EuiLink className={`eui-textTruncate ${className ?? ''}`} {...euiLinkProps} />
        </EuiFlexItem>
        {revision && (
          <EuiFlexItem grow={true}>
            <EuiText color="subdued" size="xs" style={NO_WRAP_WHITE_SPACE}>
              <FormattedMessage
                id="xpack.fleet.policyNameLink.revisionNumber"
                defaultMessage="rev. {revNumber}"
                values={{ revNumber: revision }}
              />
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
