/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { KibanaPageTemplateProps } from '../../../../../../src/plugins/kibana_react/public';
import { FleetPanel } from '../../components/app/fleet_panel';
import { ObservabilityHeaderMenu } from '../../components/app/header';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTrackPageview } from '../../hooks/use_track_metric';
import { appsSection } from '../home/section';
import './styles.scss';

export function LandingPage() {
  useTrackPageview({ app: 'observability-overview', path: 'landing' });
  useTrackPageview({ app: 'observability-overview', path: 'landing', delay: 15000 });
  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.landingLinkText', {
        defaultMessage: 'Getting started',
      }),
    },
  ]);

  const { core, ObservabilityPageTemplate } = usePluginContext();
  const theme = useContext(ThemeContext);

  // TODO: NEEDS A DATA CHECK
  // NO SIDE NAV since nothing is setup
  const hasData = false;
  const noDataConfig: KibanaPageTemplateProps['noDataConfig'] = {
    solution: i18n.translate('xpack.observability.noDataConfig.solutionName', {
      defaultMessage: 'Observability',
    }),
    actions: {
      beats: {
        description: i18n.translate('xpack.observability.noDataConfig.beatsCard.description', {
          defaultMessage:
            'Use Beats and APM agents to send observability data to Elasticsearch. We make it easy with support for many popular systems, apps, and languages.',
        }),
        href: core.http.basePath.prepend(`/app/home#/tutorial_directory/logging`),
      },
    },
    docsLink: core.docLinks.links.observability.guide,
  };

  return (
    <ObservabilityPageTemplate
      noDataConfig={hasData ? undefined : noDataConfig}
      restrictWidth
      showSolutionNav={false}
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.home.sectionTitle', {
          defaultMessage: 'Unified visibility across your entire ecosystem',
        }),
        description: i18n.translate('xpack.observability.home.sectionsubtitle', {
          defaultMessage:
            'Monitor, analyze, and react to events happening anywhere in your environment by bringing logs, metrics, and traces together at scale in a single stack.',
        }),
        alignItems: 'center',
        rightSideItems: [
          <EuiImage
            size="l"
            alt="observability overview image"
            url={core.http.basePath.prepend(
              `/plugins/observability/assets/illustration_${theme.darkMode ? 'dark' : 'light'}.svg`
            )}
            width={240}
          />,
        ],
      }}
    >
      <ObservabilityHeaderMenu />

      <EuiSpacer size="m" />

      {/* Apps sections */}
      <EuiFlexGroup gutterSize="xl" wrap alignItems="center">
        {appsSection.map((app) => (
          <EuiFlexItem key={app.id}>
            <EuiCard
              paddingSize="none"
              display="plain"
              layout="horizontal"
              title={
                <EuiTitle size="xs" className="title">
                  <h3>{app.title}</h3>
                </EuiTitle>
              }
              description={app.description}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />

      <EuiFlexGroup direction="column" alignItems="center">
        {/* Get started button */}
        <EuiFlexItem grow={false}>
          <div>
            <EuiButton
              fill
              iconType="sortRight"
              iconSide="right"
              href={core.http.basePath.prepend('/app/home#/tutorial_directory/logging')}
            >
              {i18n.translate('xpack.observability.home.getStatedButton', {
                defaultMessage: 'Get started',
              })}
            </EuiButton>

            <EuiSpacer size="xxl" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem style={{ maxWidth: 600 }}>
          <FleetPanel />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
