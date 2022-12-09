/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import {
  EuiHorizontalRule,
  EuiPageBody,
  EuiPageContent_Deprecated as EuiPageContent,
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiPageHeader,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiAccordion,
  useEuiTheme,
  htmlIdGenerator,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { RedirectToDasboards, RedirectToGeneralDasboards } from './hooks/redirect_to_dashboards';
import { MetricsPageTemplate } from '../page_template';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { kubernetesObservabilityTitle } from '../../../translations';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';

interface KubernetesObservabilityAppDeps {
  basename: string;
  application: CoreStart['application'];
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
}

export const KubernetesObservabilityPage = ({
  basename,
  notifications,
  application,
  http,
  navigation,
}: KubernetesObservabilityAppDeps) => {
  // Use React hooks to manage state.
  const [counter, seCounter] = useState(0);
  const { euiTheme } = useEuiTheme();
  const idGenerator = htmlIdGenerator('replacementCard');
  const alsoAvailable = i18n.translate('customIntegrations.components.replacementAccordionLabel', {
    defaultMessage: 'Toggle Menu',
  });
  const onClickHandler = () => {
    // Use the core http service to make a response to the server API.
    seCounter(counter + 1);
    // Use the core notifications service to display a success message.
    notifications.toasts.addSuccess(
      i18n.translate('kubernetesObservability.dataUpdated', {
        defaultMessage: 'Data updated',
      })
    );
  };

  useMetricsBreadcrumbs([
    {
      text: kubernetesObservabilityTitle,
    },
  ]);

  return (
    <>
      <MetricsPageTemplate
        pageHeader={{
          pageTitle: 'Kubernetes Observability',
        }}
        pageSectionProps={{
          contentProps: {
            css: fullHeightContentStyles,
          },
        }}
      >
        <EuiPageBody>
          <EuiPageHeader>
            <EuiTitle size="m">
              <h3>
                <FormattedMessage
                  id="kubernetesObservability.helloWorldText"
                  defaultMessage="{name}"
                  values={{ name: 'What can you do' }}
                />
              </h3>
            </EuiTitle>
          </EuiPageHeader>
          <EuiPageContent>
            <EuiPageContentBody>
              <div
                css={css`
                  & .euiAccordion__button {
                    font-weight: ${euiTheme.font.weight.bold};
                  }
                  & .euiAccordion-isOpen .euiAccordion__childWrapper {
                    margin-top: ${euiTheme.size.m};
                  }
                `}
              >
                <EuiAccordion
                  id={idGenerator()}
                  buttonContent={alsoAvailable}
                  paddingSize="none"
                  initialIsOpen={true}
                >
                  <EuiPanel color="subdued" hasShadow={false} paddingSize="m">
                    <EuiFlexGroup direction="column" gutterSize="m">
                      <EuiFlexItem key="message">
                        <EuiText size="s">
                          <FormattedMessage
                            id="customIntegrations.components.replacementAccordion.recommendationDescription"
                            defaultMessage="Elastic Agent Integrations are recommended, but you can also use Beats. For more
                details, check out our {link}."
                          />
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem key="buttons">
                        <EuiFlexGroup direction="column" gutterSize="m">
                          <div>Test1</div>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiAccordion>
                <EuiAccordion
                  id="local-variables"
                  className="euiAccordion"
                  buttonContent={i18n.translate(
                    'xpack.apm.stacktraceTab.localVariablesToogleButtonLabel1',
                    { defaultMessage: 'Alerts' }
                  )}
                >
                  <div>Pas ole</div>
                </EuiAccordion>
                <EuiAccordion
                  id="local-variables"
                  className="euiAccordion"
                  buttonContent={i18n.translate(
                    'xpack.apm.stacktraceTab.localVariablesToogleButtonLabel2',
                    { defaultMessage: 'Logs' }
                  )}
                >
                  <div>Pas ole</div>
                </EuiAccordion>
                <EuiAccordion
                  id="local-variables"
                  className="euiAccordion"
                  buttonContent={i18n.translate(
                    'xpack.apm.stacktraceTab.localVariablesToogleButtonLabel3',
                    { defaultMessage: 'Dashboards' }
                  )}
                >
                  <div>
                    <ul>
                      <li>
                        <RedirectToGeneralDasboards />
                      </li>
                      <li>
                        <RedirectToDasboards />
                      </li>
                    </ul>
                  </div>
                </EuiAccordion>
              </div>
              <EuiText>
                <p>
                  <FormattedMessage
                    id="kubernetesObservability.content"
                    defaultMessage="Check out the Integration's documentation."
                  />
                </p>
                <EuiHorizontalRule />
                <p>
                  <FormattedMessage
                    id="kubernetesObservability.timestampText"
                    defaultMessage="Last timestamp: {numbertoprint}"
                    values={{ numbertoprint: counter ? counter : 'Unknown' }}
                  />
                </p>
                <EuiButton type="primary" size="s" onClick={onClickHandler}>
                  <FormattedMessage
                    id="kubernetesObservability.buttonText"
                    defaultMessage="Get data"
                  />
                </EuiButton>
              </EuiText>
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </MetricsPageTemplate>
    </>
  );
};
