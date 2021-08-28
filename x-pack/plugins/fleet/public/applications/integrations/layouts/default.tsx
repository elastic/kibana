/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { memo } from 'react';
import styled, { useTheme } from 'styled-components';

import type { EuiTheme } from '../../../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { useLink } from '../../../hooks/use_link';
import { WithHeaderLayout } from '../../../layouts/with_header';
import { useLinks } from '../hooks/use_links';
import type { Section } from '../sections';

interface Props {
  section?: Section;
  children?: React.ReactNode;
}

const Illustration = styled(EuiImage)`
  margin-bottom: -68px;
  width: 80%;
`;

const HeroImage = memo(() => {
  const { toSharedAssets } = useLinks();
  const theme = useTheme() as EuiTheme;
  const IS_DARK_THEME = theme.darkMode;

  return (
    <Illustration
      alt={i18n.translate('xpack.fleet.epm.illustrationAltText', {
        defaultMessage: 'Illustration of an integration',
      })}
      url={
        IS_DARK_THEME
          ? toSharedAssets('illustration_integrations_darkmode.svg')
          : toSharedAssets('illustration_integrations_lightmode.svg')
      }
    />
  );
});

export const DefaultLayout: React.FunctionComponent<Props> = memo(({ section, children }) => {
  const { getHref } = useLink();

  return (
    <WithHeaderLayout
      rightColumn={<HeroImage />}
      leftColumn={
        <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.fleet.integrationsHeaderTitle"
                defaultMessage="Elastic Agent Integrations"
              />
            </h1>
          </EuiText>

          <EuiSpacer size="s" />

          <EuiFlexItem grow={false}>
            <EuiText size="m" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.fleet.epm.pageSubtitle"
                  defaultMessage="Collect data from popular apps and services using Elastic Agent"
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
