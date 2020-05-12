/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { DraggableBadge } from '../../../../../common/components/draggables';

import { isNillEmptyOrNotFinite, TokensFlexItem } from './helpers';

const HashFlexGroup = styled(EuiFlexGroup)`
  margin: ${({ theme }) => theme.eui.euiSizeXS};
`;

interface Props {
  contextId: string;
  eventId: string;
  processHashMd5: string | null | undefined;
  processHashSha1: string | null | undefined;
  processHashSha256: string | null | undefined;
}

export const ProcessHash = React.memo<Props>(
  ({ contextId, eventId, processHashMd5, processHashSha1, processHashSha256 }) => {
    if (
      isNillEmptyOrNotFinite(processHashSha256) &&
      isNillEmptyOrNotFinite(processHashSha1) &&
      isNillEmptyOrNotFinite(processHashMd5)
    ) {
      return null;
    }

    return (
      <HashFlexGroup alignItems="center" direction="column" gutterSize="none">
        {!isNillEmptyOrNotFinite(processHashSha256) && (
          <TokensFlexItem grow={false} component="div">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="process.hash.sha256"
              iconType="number"
              value={processHashSha256}
            />
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(processHashSha1) && (
          <TokensFlexItem grow={false} component="div">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="process.hash.sha1"
              iconType="number"
              value={processHashSha1}
            />
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(processHashMd5) && (
          <TokensFlexItem grow={false} component="div">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="process.hash.md5"
              iconType="number"
              value={processHashMd5}
            />
          </TokensFlexItem>
        )}
      </HashFlexGroup>
    );
  }
);

ProcessHash.displayName = 'ProcessHash';
