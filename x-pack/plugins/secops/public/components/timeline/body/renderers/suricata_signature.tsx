/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { Provider } from '../../../timeline/data_providers/provider';
import { getBeginningTokens } from './suricata_links';

const SignatureFlexItem = styled(EuiFlexItem)`
  min-width: 77px;
`;

const Badge = styled(EuiBadge)`
  vertical-align: top;
`;

const TokensFlexItem = styled(EuiFlexItem)`
  margin-left: 3px;
`;

export const GoogleLink = pure(({ link, value }: { link: string; value: string }) => (
  <TokensFlexItem grow={false}>
    <EuiLink href={`https://www.google.com/search?q=${encodeURI(link)}`} target="_blank">
      {value}
    </EuiLink>
  </TokensFlexItem>
));

export const Tokens = pure(({ tokens }: { tokens: string[] }) => (
  <>
    {tokens.map(token => (
      <TokensFlexItem key={token} grow={false}>
        <EuiBadge iconType="tag" color="hollow">
          {token}
        </EuiBadge>
      </TokensFlexItem>
    ))}
  </>
));

export const DraggableSignatureId = pure(
  ({ id, signatureId }: { id: string; signatureId: string }) => (
    <SignatureFlexItem grow={false}>
      <DraggableWrapper
        dataProvider={{
          and: [],
          enabled: true,
          id: escapeDataProviderId(`suricata-${id}-sig-${signatureId}`),
          name: signatureId,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field: 'suricata.eve.alert.signature_id',
            value: signatureId,
          },
        }}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            <Badge iconType="number" color="hollow">
              {signatureId}
            </Badge>
          )
        }
      />
    </SignatureFlexItem>
  )
);

export const SuricataSignature = pure(
  ({ id, signature, signatureId }: { id: string; signature: string; signatureId: string }) => {
    const tokens = getBeginningTokens(signature);
    return (
      <EuiFlexGroup justifyContent="center" gutterSize="none">
        <DraggableSignatureId id={id} signatureId={signatureId} />
        <Tokens tokens={tokens} />
        <GoogleLink
          link={signature}
          value={signature
            .split(' ')
            .splice(tokens.length)
            .join(' ')}
        />
      </EuiFlexGroup>
    );
  }
);
