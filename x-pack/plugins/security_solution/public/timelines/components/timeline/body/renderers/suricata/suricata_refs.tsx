/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { ExternalLinkIcon } from '../../../../../../common/components/external_link_icon';
import { getLinksFromSignature } from './suricata_links';

const LinkEuiFlexItem = styled(EuiFlexItem)`
  display: inline;
`;

LinkEuiFlexItem.displayName = 'LinkEuiFlexItem';

export const SuricataRefs = React.memo<{ signatureId: number }>(({ signatureId }) => {
  const links = getLinksFromSignature(signatureId);
  return (
    <EuiFlexGroup gutterSize="none" justifyContent="center" wrap>
      {links.map((link) => (
        <LinkEuiFlexItem key={link} grow={false}>
          <EuiLink href={link} color="subdued" target="_blank">
            {link}
          </EuiLink>
          <ExternalLinkIcon />
        </LinkEuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});

SuricataRefs.displayName = 'SuricataRefs';
