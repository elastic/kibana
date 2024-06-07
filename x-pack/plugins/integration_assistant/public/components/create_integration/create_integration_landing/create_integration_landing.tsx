/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { AssistantAvatar } from '@kbn/elastic-assistant';
import { IntegrationImageHeader } from '../../../common/components/integration_image_header';
import { ButtonsFooter } from '../../../common/components/buttons_footer';
import { ButtonPanel } from '../../../common/components/button_panel';
import { SectionWrapper } from '../../../common/components/section_wrapper';
import type { SetPage } from '../../types';
import * as i18n from './translations';

interface CreateIntegrationLandingProps {
  setPage: SetPage;
}
export const CreateIntegrationLanding = React.memo<CreateIntegrationLandingProps>(({ setPage }) => {
  return (
    <KibanaPageTemplate>
      <IntegrationImageHeader />
      <SectionWrapper title={i18n.LANDING_TITLE} subtitle={i18n.LANDING_DESCRIPTION}>
        <EuiFlexGroup direction="row" gutterSize="l" alignItems="center" justifyContent="center">
          <EuiFlexItem>
            <ButtonPanel
              icon={<EuiIcon type="exportAction" size="l" />}
              title={i18n.PACKAGE_UPLOAD_TITLE}
              description={i18n.PACKAGE_UPLOAD_DESCRIPTION}
              buttonLabel={i18n.PACKAGE_UPLOAD_BUTTON}
              onClick={() => setPage('upload')}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <ButtonPanel
              icon={<AssistantAvatar />}
              title={i18n.ASSISTANT_TITLE}
              description={i18n.ASSISTANT_DESCRIPTION}
              buttonLabel={i18n.ASSISTANT_BUTTON}
              onClick={() => setPage('assistant')}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SectionWrapper>
      <ButtonsFooter />
    </KibanaPageTemplate>
  );
});
CreateIntegrationLanding.displayName = 'CreateIntegrationLanding';
