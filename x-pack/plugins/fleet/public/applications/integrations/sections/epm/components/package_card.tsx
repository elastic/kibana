/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiCard } from '@elastic/eui';

import type { PackageListItem } from '../../../types';
import { useLink } from '../../../hooks';
import { PackageIcon } from '../../../components';

import { RELEASE_BADGE_LABEL, RELEASE_BADGE_DESCRIPTION } from './release_badge';

type PackageCardProps = PackageListItem;

// adding the `href` causes EuiCard to use a `a` instead of a `button`
// `a` tags use `euiLinkColor` which results in blueish Badge text
const Card = styled(EuiCard)`
  color: inherit;
`;

export function PackageCard({
  description,
  name,
  title,
  version,
  release,
  status,
  icons,
  integration,
  ...restProps
}: PackageCardProps) {
  const { getHref } = useLink();
  let urlVersion = version;
  // if this is an installed package, link to the version installed
  if ('savedObject' in restProps) {
    urlVersion = restProps.savedObject.attributes.version || version;
  }

  return (
    <Card
      title={title || ''}
      description={description}
      icon={
        <PackageIcon
          icons={icons}
          packageName={name}
          integrationName={integration}
          version={version}
          size="xl"
        />
      }
      href={getHref('integration_details_overview', {
        pkgkey: `${name}-${urlVersion}`,
        ...(integration ? { integration } : {}),
      })}
      betaBadgeLabel={release && release !== 'ga' ? RELEASE_BADGE_LABEL[release] : undefined}
      betaBadgeTooltipContent={
        release && release !== 'ga' ? RELEASE_BADGE_DESCRIPTION[release] : undefined
      }
    />
  );
}
