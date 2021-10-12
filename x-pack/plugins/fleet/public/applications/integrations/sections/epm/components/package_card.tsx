/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  EuiBadge,
  EuiToolTip,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';

import { CardIcon } from '../../../../../components/package_icon';
import type { IntegrationCardItem } from '../../../../../../common/types/models/epm';

import { RELEASE_BADGE_DESCRIPTION, RELEASE_BADGE_LABEL } from './release_badge';

export type PackageCardProps = IntegrationCardItem;

const Link = styled(EuiLink)`
  &.euiLink {
    color: inherit;
  }
  &.euiLink:hover {
    text-decoration: none;
  }
`;

export function PackageCard({
  description,
  name,
  title,
  version,
  icons,
  integration,
  url,
  release,
}: PackageCardProps) {
  let releaseBadge: React.ReactNode | null = null;

  if (release && release !== 'ga') {
    releaseBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiToolTip display="inlineBlock" content={RELEASE_BADGE_DESCRIPTION[release]}>
            <EuiBadge color="hollow">{RELEASE_BADGE_LABEL[release]}</EuiBadge>
          </EuiToolTip>
        </span>
      </EuiFlexItem>
    );
  }

  return (
    <Link href={url}>
      <EuiPanel paddingSize="m">
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false}>
            <CardIcon
              icons={icons}
              packageName={name}
              integrationName={integration}
              version={version}
              size="xl"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>{title}</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">{description}</EuiText>
              </EuiFlexItem>
              {releaseBadge}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </Link>
  );
}
