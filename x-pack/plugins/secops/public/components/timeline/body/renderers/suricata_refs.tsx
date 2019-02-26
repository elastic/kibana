/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { getLinksFromSignature } from './suricata_links';

const Icon = styled(EuiIcon)`
  margin-left: 10px;
  margin-right: 3px;
`;

const LinkEuiFlexItem = styled(EuiFlexItem)`
  display: inline;
`;

export const SuricataRefs = pure(
  ({ signature, signatureId }: { signature: string; signatureId: string }) => {
    const links = getLinksFromSignature(signatureId);
    return (
      <EuiFlexGroup gutterSize="none" justifyContent="center" wrap>
        {links.map(link => (
          <LinkEuiFlexItem key={link} grow={false}>
            <Icon type="link" size="s" />
            <EuiLink href={link} color="subdued" target="_blank">
              {link}
            </EuiLink>
          </LinkEuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);
