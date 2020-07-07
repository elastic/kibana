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
import React, { useContext } from 'react';
import styled, { ThemeContext } from 'styled-components';
import { WithHeaderLayout } from '../../components/app/layout/with_header';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { appsSection } from '../home/section';

const EuiCardWithoutPadding = styled(EuiCard)`
  padding: 0;
`;

export const LandingPage = () => {
  const { core } = usePluginContext();
  const theme = useContext(ThemeContext);

  return (
    <WithHeaderLayout
      restrictWidth={1200}
      headerColor={theme.eui.euiPageBackgroundColor}
      bodyColor={theme.eui.euiColorEmptyShade}
    >
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

        <EuiSpacer size="xxl" />

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
    </WithHeaderLayout>
  );
};
