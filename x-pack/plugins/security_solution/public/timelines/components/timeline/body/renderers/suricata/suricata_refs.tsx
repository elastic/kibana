/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { getLinksFromSignature } from './suricata_links';

const LinkEuiFlexItem = styled(EuiFlexItem)`
  display: inline;
`;

LinkEuiFlexItem.displayName = 'LinkEuiFlexItem';

export const SuricataRefs = React.memo<{ signatureId: number }>(({ signatureId }) => {
  let comp = <></>;
  getLinksFromSignature(signatureId).then((links) => {
    comp = (
      <EuiFlexGroup gutterSize="none" justifyContent="center" wrap>
        {links.map((link) => (
          <LinkEuiFlexItem key={link} grow={false}>
            <EuiLink href={link} color="subdued" target="_blank">
              {link}
            </EuiLink>
          </LinkEuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  });
  return comp;
});

SuricataRefs.displayName = 'SuricataRefs';
