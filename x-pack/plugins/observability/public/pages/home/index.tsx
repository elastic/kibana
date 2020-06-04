/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiImage,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { ISection, Section } from './section';

const appsSection: ISection[] = [
  {
    id: 'logs',
    title: i18n.translate('xpack.observability.section.apps.logs.title', {
      defaultMessage: 'Logs',
    }),
    icon: 'logoLogging',
    description: i18n.translate('xpack.observability.section.apps.logs.description', {
      defaultMessage:
        'The Elastic Stack (sometimes known as the ELK Stack) is the most popular open source logging platform.',
    }),
  },
  {
    id: 'apm',
    title: i18n.translate('xpack.observability.section.apps.apm.title', {
      defaultMessage: 'APM',
    }),
    icon: 'logoAPM',
    description: i18n.translate('xpack.observability.section.apps.apm.description', {
      defaultMessage:
        'See exactly where your application is spending time so you can quickly fix issues and feel good about the code you push.',
    }),
  },
  {
    id: 'metrics',
    title: i18n.translate('xpack.observability.section.apps.metrics.title', {
      defaultMessage: 'Metrics',
    }),
    icon: 'logoMetrics',
    description: i18n.translate('xpack.observability.section.apps.metrics.description', {
      defaultMessage:
        'Already using the Elastic Stack for logs? Add metrics in just a few steps and correlate metrics and logs in one place.',
    }),
  },
  {
    id: 'uptime',
    title: i18n.translate('xpack.observability.section.apps.uptime.title', {
      defaultMessage: 'Uptime',
    }),
    icon: 'logoUptime',
    description: i18n.translate('xpack.observability.section.apps.uptime.description', {
      defaultMessage:
        'React to availability issues across your apps and services before they affect users.',
    }),
  },
];

const tryItOutItemsSection: ISection[] = [
  {
    id: 'demo',
    title: i18n.translate('xpack.observability.section.tryItOut.demo.title', {
      defaultMessage: 'Demo Playground',
    }),
    icon: 'play',
    description: '',
    href: 'https://demo.elastic.co/',
    target: '_blank',
  },
  {
    id: 'sampleData',
    title: i18n.translate('xpack.observability.section.tryItOut.sampleData.title', {
      defaultMessage: 'Add sample data',
    }),
    icon: 'documents',
    description: '',
    href: '/app/home#/tutorial_directory/sampleData',
  },
];

const Container = styled.div`
  min-height: calc(100vh - 48px);
  background: ${(props) => props.theme.eui.euiColorEmptyShade};
`;

const Title = styled.div`
  background-color: ${(props) => props.theme.eui.euiPageBackgroundColor};
  border-bottom: ${(props) => props.theme.eui.euiBorderThin};
`;

const Page = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  overflow: hidden;
}
`;

export const Home = () => {
  const { core } = usePluginContext();

  useEffect(() => {
    core.chrome.setBreadcrumbs([
      {
        text: i18n.translate('xpack.observability.home.breadcrumb.observability', {
          defaultMessage: 'Observability',
        }),
      },
      {
        text: i18n.translate('xpack.observability.home.breadcrumb.gettingStarted', {
          defaultMessage: 'Getting started',
        }),
      },
    ]);
  }, [core]);

  return (
    <Container>
      <Title>
        <Page>
          <EuiSpacer size="xxl" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiIcon type="logoObservability" size="xxl" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="m">
                <h1>
                  {i18n.translate('xpack.observability.home.title', {
                    defaultMessage: 'Observability',
                  })}
                </h1>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xxl" />
        </Page>
      </Title>
      <Page>
        <EuiSpacer size="xxl" />
        <EuiFlexGroup direction="column">
          {/* title and description */}
          <EuiFlexItem style={{ maxWidth: '50%' }}>
            <EuiTitle size="s">
              <h2>
                {i18n.translate('xpack.observability.home.sectionTitle', {
                  defaultMessage: 'Observability built on the Elastic Stack',
                })}
              </h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.observability.home.sectionsubtitle', {
                defaultMessage:
                  'Bring your logs, metrics, and APM traces together at scale in a single stack so you can monitor and react to events happening anywhere in your environment.',
              })}
            </EuiText>
          </EuiFlexItem>

          {/* Apps sections */}
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFlexGrid columns={2}>
                  {appsSection.map((app) => (
                    <Section section={app} key={app.id} />
                  ))}
                </EuiFlexGrid>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiImage
                  size="xl"
                  alt="observability overview image"
                  url={core.http.basePath.prepend(
                    '/plugins/observability/assets/observability_overview.png'
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {/* Get started button */}
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="center" gutterSize="none">
              <EuiFlexItem grow={false}>
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
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiHorizontalRule margin="xl" />

          {/* Try it out */}
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate('xpack.observability.home.tryItOut', {
                      defaultMessage: 'Try it out',
                    })}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {/* Try it out sections */}
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="center">
              {tryItOutItemsSection.map((item) => (
                <EuiFlexItem grow={false} key={item.id} style={{ width: '260px' }}>
                  <EuiCard
                    layout="horizontal"
                    icon={<EuiIcon size="l" type={item.icon} />}
                    title={
                      <EuiTitle size="xs" className="title">
                        <h3>{item.title}</h3>
                      </EuiTitle>
                    }
                    description={item.description}
                    target={item.target}
                    href={item.href}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Page>
    </Container>
  );
};
