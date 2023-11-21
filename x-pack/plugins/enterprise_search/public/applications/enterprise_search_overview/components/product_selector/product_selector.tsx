/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WelcomeBanner } from '@kbn/search-api-panels';

import { AuthenticatedUser } from '@kbn/security-plugin/common';

import { ErrorStateCallout } from '../../../shared/error_state';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { SetSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendEnterpriseSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import headerImage from '../../assets/search_header.svg';

import { EnterpriseSearchOverviewPageTemplate } from '../layout';
import { SetupGuideCta } from '../setup_guide';
import { TrialCallout } from '../trial_callout';

import { ElasticsearchProductCard } from './elasticsearch_product_card';
import { EnterpriseSearchProductCard } from './enterprise_search_product_card';
import { IngestionSelector } from './ingestion_selector';

import './product_selector.scss';

interface ProductSelectorProps {
  access: {
    hasAppSearchAccess?: boolean;
    hasWorkplaceSearchAccess?: boolean;
  };
  isWorkplaceSearchAdmin: boolean;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  access,
  isWorkplaceSearchAdmin,
}) => {
  const { hasAppSearchAccess, hasWorkplaceSearchAccess } = access;
  const { config } = useValues(KibanaLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);
  const { security } = useValues(KibanaLogic);

  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    try {
      security.authc
        .getCurrentUser()
        .then(setUser)
        .catch(() => {
          setUser(null);
        });
    } catch {
      setUser(null);
    }
  }, [security.authc]);

  const showErrorConnecting = !!(config.host && errorConnectingMessage);
  // The create index flow does not work without ent-search, when content is updated
  // to no longer rely on ent-search we can always show the Add Content component

  return (
    <>
      <EnterpriseSearchOverviewPageTemplate restrictWidth grow offset={0} customPageSections>
        <TrialCallout />
        <EuiPageTemplate.Section alignment="top" className="entSearchProductSelectorHeader">
          <EuiText color="ghost">
            <WelcomeBanner user={user || undefined} image={headerImage} showDescription={false} />
          </EuiText>
        </EuiPageTemplate.Section>

        <EuiPageTemplate.Section>
          <SetPageChrome />
          <SendTelemetry action="viewed" metric="overview" />
        </EuiPageTemplate.Section>

        <EuiPageTemplate.Section>
          <EuiSpacer size="xl" />
          <EuiTitle>
            <h4>
              {i18n.translate('xpack.enterpriseSearch.productSelector.overview.title', {
                defaultMessage: 'Ingest your content',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="l" />
          <EuiText>
            <p>
              {i18n.translate('xpack.enterpriseSearch.productSelector.overview.description', {
                defaultMessage:
                  'The first step in building your search experience is to create a search-optimized Elasticsearch index and import your content into it. Elasticsearch offers several user-friendly options you can choose from that best match your technical expertise and data sources.',
              })}
            </p>
          </EuiText>

          <EuiSpacer size="xl" />
          <IngestionSelector />
          <EuiSpacer />
          {showErrorConnecting && (
            <>
              <SendTelemetry action="error" metric="cannot_connect" />
              <ErrorStateCallout />
            </>
          )}
          <EuiSpacer size="xl" />

          <EuiTitle>
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.productSelector.overview.createCustom.title',
                {
                  defaultMessage: 'Create a custom search experience',
                }
              )}
            </h4>
          </EuiTitle>
          <EuiSpacer size="l" />
          <EuiText>
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.productSelector.overview.createCustom.description',
                {
                  defaultMessage:
                    "Once your index is created and populated, you'll be ready to use the full power of Elasticsearch. Build search applications using our out-of-the-box tools and programming language clients, all backed by a robust set of APIs.",
                }
              )}
            </p>
          </EuiText>

          <EuiSpacer size="xl" />

          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <ElasticsearchProductCard />
            </EuiFlexItem>
            {(hasAppSearchAccess || hasWorkplaceSearchAccess) && (
              <EuiFlexItem>
                <EnterpriseSearchProductCard
                  hasAppSearchAccess={hasAppSearchAccess ?? false}
                  hasWorkplaceSearchAccess={hasWorkplaceSearchAccess ?? false}
                  isWorkplaceSearchAdmin={isWorkplaceSearchAdmin}
                />
              </EuiFlexItem>
            )}
            {!config.host && config.canDeployEntSearch && (
              <EuiFlexItem>
                <SetupGuideCta />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPageTemplate.Section>
      </EnterpriseSearchOverviewPageTemplate>
    </>
  );
};
