/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiPanel,
  EuiIcon,
  EuiButton,
  EuiLink,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AssistantAvatar } from '@kbn/elastic-assistant';
import { useKibana } from '../../../common/hooks/use_kibana';
import integrationsImage from '../../../images/integrations_light.svg';
import type { SetPage } from '../../types';

const contendCss = css`
  width: 100%;
  max-width: 670px;
`;
const headerCss = css`
  > div {
    padding-block: 0;
  }
`;
const titleCss = css`
  text-align: center;
`;
const imageCss = css`
  width: 318px;
  height: 183px;
  object-fit: cover;
  object-position: center top;
`;

interface CreateIntegrationLandingProps {
  setPage: SetPage;
}
export const CreateIntegrationLanding = React.memo<CreateIntegrationLandingProps>(({ setPage }) => {
  const integrationsUrl = useKibana().services.application.getUrlForApp('integrations');
  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header css={headerCss}>
        <EuiFlexGroup direction="column" alignItems="center">
          <EuiFlexItem>
            <EuiSpacer size="xl" />
            <EuiImage alt="create integration background" src={integrationsImage} css={imageCss} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section grow>
        <EuiSpacer size="xxl" />
        <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
          <EuiFlexItem css={contendCss}>
            <EuiTitle size="l">
              <h1 css={titleCss}>
                <FormattedMessage
                  id="xpack.integrationAssistant.createIntegrationLanding.title"
                  defaultMessage="Create new integration"
                />
              </h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem css={contendCss}>
            <EuiText size="s" textAlign="center" color="subdued">
              <FormattedMessage
                id="xpack.integrationAssistant.createIntegrationLanding.description"
                defaultMessage="Start an AI-driven process to build your integration step-by-step, or you can either upload a .zip package with an already created integration"
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem css={contendCss}>
            <EuiSpacer size="m" />
            <EuiFlexGroup
              direction="row"
              gutterSize="l"
              alignItems="center"
              justifyContent="center"
            >
              <EuiFlexItem>
                <ButtonPanel
                  icon={<EuiIcon type="exportAction" size="l" />}
                  title={
                    <FormattedMessage
                      id="xpack.integrationAssistant.createIntegrationLanding.packageUpload.title"
                      defaultMessage="Package upload"
                    />
                  }
                  description={
                    <FormattedMessage
                      id="xpack.integrationAssistant.createIntegrationLanding.packageUpload.description"
                      defaultMessage="Use this option if you have an existing integration package in a .zip file"
                    />
                  }
                  buttonLabel={
                    <FormattedMessage
                      id="xpack.integrationAssistant.createIntegrationLanding.packageUpload.button"
                      defaultMessage="Upload .zip"
                    />
                  }
                  onClick={() => setPage('upload')}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <ButtonPanel
                  icon={<AssistantAvatar />}
                  title={
                    <FormattedMessage
                      id="xpack.integrationAssistant.createIntegrationLanding.assistant.title"
                      defaultMessage="AI driven creation"
                    />
                  }
                  description={
                    <FormattedMessage
                      id="xpack.integrationAssistant.createIntegrationLanding.assistant.description"
                      defaultMessage="Build your integration using our AI-driven process from scratch"
                    />
                  }
                  buttonLabel={
                    <FormattedMessage
                      id="xpack.integrationAssistant.createIntegrationLanding.assistant.button"
                      defaultMessage="Create Integration"
                    />
                  }
                  onClick={() => setPage('assistant')}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.BottomBar>
        <EuiLink href={integrationsUrl} color="text">
          <FormattedMessage
            id="xpack.integrationAssistant.createIntegrationLanding.cancel"
            defaultMessage="Cancel"
          />
        </EuiLink>
      </KibanaPageTemplate.BottomBar>
    </KibanaPageTemplate>
  );
});
CreateIntegrationLanding.displayName = 'CreateIntegrationLanding';

interface ButtonPanelProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  buttonLabel: React.ReactNode;
  onClick: () => void;
}
const ButtonPanel = React.memo<ButtonPanelProps>(
  ({ icon, title, description, buttonLabel, onClick }) => (
    <EuiPanel hasShadow={true} hasBorder={true} paddingSize="l">
      <EuiFlexGroup direction="column" gutterSize="m" alignItems="center">
        <EuiFlexItem>{icon}</EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3 css={titleCss}>{title} </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued" textAlign="center">
                {description}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiButton onClick={onClick}>{buttonLabel}</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  )
);
ButtonPanel.displayName = 'ButtonPanel';
