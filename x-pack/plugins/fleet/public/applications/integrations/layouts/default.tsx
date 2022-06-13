/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useLink } from '../../../hooks';
import type { Section } from '../sections';

import { WithHeaderLayout } from '.';

interface Props {
  section?: Section;
  children?: React.ReactNode;
}

export const DefaultLayout: React.FunctionComponent<Props> = memo(({ section, children }) => {
  const { getHref } = useLink();

  return (
    <WithHeaderLayout
      leftColumn={
        <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.fleet.integrationsHeaderTitle"
                defaultMessage="Integrations"
              />
            </h1>
          </EuiText>

          <EuiSpacer size="s" />

          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.fleet.epm.pageSubtitle"
                  defaultMessage="Choose an integration to start collecting and analyzing your data."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      tabs={[
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.appNavigation.integrationsAllLinkText"
              defaultMessage="Browse integrations"
            />
          ),
          isSelected: section === 'browse',
          href: getHref('integrations_all'),
        },
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.appNavigation.integrationsInstalledLinkText"
              defaultMessage="Installed integrations"
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
