/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiSpacer, EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { i18n } from '@kbn/i18n';

import styled, { useTheme } from 'styled-components';

import type { EuiTheme } from 'src/plugins/kibana_react/common';

import { useLink } from '../../../hooks';
import type { Section } from '../sections';

import { useLinks, useStartServices } from '../hooks';

import { WithHeaderLayout } from './';

interface Props {
  section?: Section;
  children?: React.ReactNode;
}

const Illustration = styled(EuiImage)`
  margin-bottom: -77px;
  position: relative;
  top: -16px;
  width: 395px;
`;

const Hero = styled.div`
  text-align: right;
`;

const HeroImage = memo(() => {
  const { toSharedAssets } = useLinks();
  const theme = useTheme() as EuiTheme;
  const IS_DARK_THEME = theme.darkMode;

  return (
    <Hero>
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
    </Hero>
  );
});

export const DefaultLayout: React.FunctionComponent<Props> = memo(({ section, children }) => {
  const { getHref } = useLink();
  const { docLinks } = useStartServices();

  return (
    <WithHeaderLayout
      rightColumn={<HeroImage />}
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
            <EuiText size="m" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.fleet.epm.pageSubtitle"
                  defaultMessage="Collect data from popular applications and services.  To learn more about Integrations, view {link}"
                  values={{
                    link: (
                      <EuiLink target="_blank" href={docLinks.links.fleet.elasticStackGetStarted}>
                        {i18n.translate('xpack.fleet.epm.pageSubtitleLinkText', {
                          defaultMessage: 'Getting started with Elastic Stack',
                        })}
                      </EuiLink>
                    ),
                  }}
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
