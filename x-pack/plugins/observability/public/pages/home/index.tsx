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
import { appsSection } from './section';

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

const EuiCardWithoutPadding = styled(EuiCard)`
  padding: 0;
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
                  defaultMessage: 'Unified visibility across your entire ecosystem',
                })}
              </h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.observability.home.sectionsubtitle', {
                defaultMessage:
                  'Monitor, analyze, and react to events happening anywhere in your environment by bringing logs, metrics, and traces together at scale in a single stack.',
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
                    <EuiFlexItem key={app.id}>
                      <EuiCardWithoutPadding
                        display="plain"
                        layout="horizontal"
                        icon={<EuiIcon size="l" type={app.icon} />}
                        title={
                          <EuiTitle size="xs" className="title">
                            <h3>{app.title}</h3>
                          </EuiTitle>
                        }
                        description={app.description}
                      />
                    </EuiFlexItem>
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
        </EuiFlexGroup>
      </Page>
    </Container>
  );
};
