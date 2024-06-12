/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { AssistantAvatar } from '@kbn/elastic-assistant';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { IntegrationImageHeader } from '../../../common/components/integration_image_header';
import { ButtonsFooter } from '../../../common/components/buttons_footer';
import { SectionWrapper } from '../../../common/components/section_wrapper';
import type { SetPage } from '../../types';
import * as i18n from './translations';

const useAssistantCardCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    // compensate for EuiCard children margin-block-start
    margin-block-start: calc(${euiTheme.size.s} * -2);
  `;
};

interface CreateIntegrationLandingProps {
  setPage: SetPage;
}
export const CreateIntegrationLanding = React.memo<CreateIntegrationLandingProps>(({ setPage }) => {
  const assistantCardCss = useAssistantCardCss();
  return (
    <KibanaPageTemplate>
      <IntegrationImageHeader />
      <KibanaPageTemplate.Section grow>
        <SectionWrapper title={i18n.LANDING_TITLE} subtitle={i18n.LANDING_DESCRIPTION}>
          <EuiFlexGroup
            direction="column"
            gutterSize="l"
            alignItems="flexStart"
            justifyContent="flexStart"
          >
            <EuiFlexItem>
              <EuiSpacer size="l" />
              <EuiCard
                display="plain"
                hasBorder={true}
                paddingSize="l"
                title={''} // this is required
                betaBadgeProps={{
                  label: i18n.TECH_PREVIEW,
                  tooltipContent: i18n.TECH_PREVIEW_TOOLTIP,
                }}
              >
                <EuiFlexGroup
                  direction="row"
                  gutterSize="m"
                  alignItems="center"
                  justifyContent="center"
                  css={assistantCardCss}
                >
                  <EuiFlexItem grow={false}>
                    <AssistantAvatar />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup
                      direction="column"
                      gutterSize="s"
                      alignItems="flexStart"
                      justifyContent="flexStart"
                    >
                      <EuiFlexItem>
                        <EuiTitle size="xs">
                          <h3>{i18n.ASSISTANT_TITLE}</h3>
                        </EuiTitle>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s" color="subdued" textAlign="left">
                          {i18n.ASSISTANT_DESCRIPTION}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton onClick={() => setPage('assistant')}>
                      {i18n.ASSISTANT_BUTTON}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiCard>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup
                direction="row"
                gutterSize="s"
                alignItems="center"
                justifyContent="flexStart"
              >
                <EuiFlexItem grow={false}>
                  <EuiIcon type="package" size="l" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <FormattedMessage
                      id="xpack.integrationAssistant.createIntegrationLanding.uploadPackageDescription"
                      defaultMessage="If you have an existing integration package, {link}"
                      values={{
                        link: (
                          <EuiLink onClick={() => setPage('upload')}>
                            <FormattedMessage
                              id="xpack.integrationAssistant.createIntegrationLanding.uploadPackageLink"
                              defaultMessage="upload it as a .zip"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </SectionWrapper>
      </KibanaPageTemplate.Section>
      <ButtonsFooter />
    </KibanaPageTemplate>
  );
});
CreateIntegrationLanding.displayName = 'CreateIntegrationLanding';
