/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { useLink } from '../../../hooks';
import type { Section } from '../sections';

import { HeroImage } from '../sections/epm/screens/home/header';

import { WithHeaderLayout } from './';

interface Props {
  section?: Section;
  children?: React.ReactNode;
}

export const DefaultLayout: React.FunctionComponent<Props> = memo(({ section, children }) => {
  const { getHref } = useLink();

  return (
    <WithHeaderLayout
      rightColumn={<HeroImage />}
      leftColumn={
        <EuiText>
          <h1>
            <FormattedMessage id="xpack.fleet.integrationsAppTitle" defaultMessage="Integrations" />{' '}
          </h1>
        </EuiText>
      }
      tabs={[
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.appNavigation.integrationsAllLinkText"
              defaultMessage="Browse"
            />
          ),
          isSelected: section === 'browse',
          href: getHref('integrations_all'),
        },
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.appNavigation.integrationsInstalledLinkText"
              defaultMessage="Manage"
            />
          ),
          isSelected: section === 'manage',
          href: getHref('integrations_installed'),
        },
      ]}
    >
      {children}
    </WithHeaderLayout>
  );
});
