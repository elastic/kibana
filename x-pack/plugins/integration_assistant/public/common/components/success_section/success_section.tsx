/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type PropsWithChildren } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import * as i18n from './translations';
import { useKibana } from '../../../components/create_integration/use_kibana';
import { ButtonPanel } from '../button_panel';
import { SectionWrapper } from '../section_wrapper';

export type SectionWrapperProps = PropsWithChildren<{
  integrationName: string;
}>;

export const SuccessSection = React.memo<SectionWrapperProps>(({ integrationName, children }) => {
  const getUrlForApp = useKibana().services.application?.getUrlForApp;

  const { installIntegrationUrl, viewIntegrationUrl } = useMemo(() => {
    if (!getUrlForApp) {
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
    <SectionWrapper title={i18n.SUCCESS_TITLE} subtitle={i18n.SUCCESS_DESCRIPTION}>
      <EuiFlexGroup direction="row" gutterSize="l" alignItems="center" justifyContent="center">
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
      {children}
    </SectionWrapper>
  );
});
SuccessSection.displayName = 'SuccessSection';
