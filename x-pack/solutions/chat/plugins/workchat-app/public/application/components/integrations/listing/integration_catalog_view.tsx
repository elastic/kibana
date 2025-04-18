import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { IntegrationType } from '@kbn/wci-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { IntegrationListView } from './integration_list_view';


export const IntegrationCatalogView: React.FC = () => {

    const types = IntegrationType
    return (
        <KibanaPageTemplate data-test-subj="integrationsCatalogPage">
        <IntegrationListView tab={'catalog'}/>
          <EuiHorizontalRule margin="none" css={{ height: 2 }} />
            <KibanaPageTemplate.Section>
            <>
              <EuiText size="xs">HEY</EuiText>
              <EuiSpacer size="s" />
              
            </>
              
            </KibanaPageTemplate.Section>
        </KibanaPageTemplate>
      )
    };
