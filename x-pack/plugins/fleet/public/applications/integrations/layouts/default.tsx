/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import styled from 'styled-components';

import { useLink } from '../../../hooks';
import type { Section } from '../sections';

import { WithHeaderLayout } from '.';

const TabBadge = styled(EuiBadge)`
  padding: 0 1px;
  margin-left: 4px;
`;

const TabTitle: React.FC<{ title: JSX.Element; hasWarning: boolean }> = memo(
  ({ title, hasWarning }) => {
    return (
      <>
        {title}
        {hasWarning && <TabBadge color="warning" iconType="alert" />}
      </>
    );
  }
);
interface Props {
  section?: Section;
  children?: React.ReactNode;
  sectionsWithWarning?: Section[];
}

export const DefaultLayout: React.FC<Props> = memo(({ section, children, sectionsWithWarning }) => {
  const { getHref } = useLink();
  const tabs = [
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.appNavigation.integrationsAllLinkText"
          defaultMessage="Browse integrations"
        />
      ),
      section: 'browse' as Section,
      href: getHref('integrations_all'),
    },
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.appNavigation.integrationsInstalledLinkText"
          defaultMessage="Installed integrations"
        />
      ),
      section: 'manage' as Section,
      href: getHref('integrations_installed'),
    },
  ];

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
      tabs={tabs.map((tab) => ({
        name: (
          <TabTitle title={tab.name} hasWarning={!!sectionsWithWarning?.includes(tab.section)} />
        ),
        href: tab.href,
        isSelected: section === tab.section,
      }))}
    >
      {children}
    </WithHeaderLayout>
  );
});
