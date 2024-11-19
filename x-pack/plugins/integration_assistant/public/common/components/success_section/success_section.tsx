/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type PropsWithChildren } from 'react';

import { EuiButton, EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import * as i18n from './translations';
import { useKibana } from '../../hooks/use_kibana';
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
      <EuiFlexGroup
        direction="row"
        gutterSize="l"
        alignItems="center"
        justifyContent="center"
        data-test-subj="integrationSuccessSection"
      >
        <EuiFlexItem>
          <EuiCard
            paddingSize="l"
            titleSize="xs"
            icon={<EuiIcon type="launch" size="l" />}
            title={i18n.ADD_TO_AGENT_TITLE}
            description={i18n.ADD_TO_AGENT_DESCRIPTION}
            footer={<EuiButton href={installIntegrationUrl}>{i18n.ADD_TO_AGENT_BUTTON}</EuiButton>}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            paddingSize="l"
            titleSize="xs"
            icon={<EuiIcon type="eye" size="l" />}
            title={i18n.VIEW_INTEGRATION_TITLE}
            description={i18n.VIEW_INTEGRATION_DESCRIPTION}
            footer={
              <EuiButton href={viewIntegrationUrl} data-test-subj="viewIntegrationButton">
                {i18n.VIEW_INTEGRATION_BUTTON}
              </EuiButton>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {children}
    </SectionWrapper>
  );
});
SuccessSection.displayName = 'SuccessSection';
