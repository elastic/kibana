/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiText, EuiIcon } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLocation } from 'react-router-dom';
import { ButtonPanel } from '../../../common/components/button_panel';
import { IntegrationImageHeader } from '../../../common/components/integration_image_header';
import { ButtonsFooter } from '../../../common/components/buttons_footer';
import type { SetPage } from '../../types';
import * as i18n from './translations';
import { IntegrationNameParam } from '../../constants';

const contentCss = css`
  width: 100%;
  max-width: 47em;
`;
const titleCss = css`
  text-align: center;
`;

interface CreateIntegrationSuccessProps {
  setPage: SetPage;
}
export const CreateIntegrationSuccess = React.memo<CreateIntegrationSuccessProps>(({ setPage }) => {
  const { search } = useLocation();
  const getUrlForApp = useKibana().services.application?.getUrlForApp;

  const integrationName = useMemo(() => {
    const searchParams = new URLSearchParams(search);
    return searchParams.get(IntegrationNameParam);
  }, [search]);

  const { installIntegrationUrl, viewIntegrationUrl } = useMemo(() => {
    if (!integrationName || !getUrlForApp) {
      return { installIntegrationUrl: '', viewIntegrationUrl: '' };
    }
    return {
      installIntegrationUrl: getUrlForApp?.('fleet', {
        path: `/integrations/${integrationName}/add-integration`,
      }),
      viewIntegrationUrl: getUrlForApp?.('integrations', {
        path: `/detail/${integrationName}`,
      }),
    };
  }, [integrationName, getUrlForApp]);

  return (
    <KibanaPageTemplate>
      <IntegrationImageHeader />
      <KibanaPageTemplate.Section grow>
        <EuiSpacer size="xxl" />
        <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
          <EuiFlexItem css={contentCss}>
            <EuiTitle size="l">
              <h1 css={titleCss}>{i18n.SUCCESS_TITLE}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem css={contentCss}>
            <EuiText size="s" textAlign="center" color="subdued">
              {i18n.SUCCESS_DESCRIPTION}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem css={contentCss}>
            <EuiSpacer size="m" />
            <EuiFlexGroup
              direction="row"
              gutterSize="l"
              alignItems="center"
              justifyContent="center"
            >
              <EuiFlexItem>
                <ButtonPanel
                  icon={<EuiIcon type="launch" size="l" />}
                  title={i18n.ADD_TO_AGENT_TITLE}
                  description={i18n.ADD_TO_AGENT_DESCRIPTION}
                  buttonLabel={i18n.ADD_TO_AGENT_BUTTON}
                  href={installIntegrationUrl}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <ButtonPanel
                  icon={<EuiIcon type="eye" size="l" />}
                  title={i18n.VIEW_INTEGRATION_TITLE}
                  description={i18n.VIEW_INTEGRATION_DESCRIPTION}
                  buttonLabel={i18n.VIEW_INTEGRATION_BUTTON}
                  href={viewIntegrationUrl}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSpacer size="xxl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
      <ButtonsFooter cancelButtonText="Close" />
    </KibanaPageTemplate>
  );
});
CreateIntegrationSuccess.displayName = 'CreateIntegrationSuccess';
