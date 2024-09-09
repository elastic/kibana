/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ObservabilityOnboardingContextValue } from '../../../plugin';

export function GetStartedPanel({
  integration,
  actionLinks,
  previewImage = 'charts_screen.svg',
  newTab,
  isLoading,
}: {
  integration: string;
  newTab: boolean;
  actionLinks: Array<{
    id: string;
    title: string;
    label: string;
    href: string;
  }>;
  previewImage?: string;
  isLoading: boolean;
}) {
  const {
    services: { http },
  } = useKibana<ObservabilityOnboardingContextValue>();

  return (
    <>
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {isLoading ? (
            <EuiSkeletonRectangle width={162} height={117} />
          ) : (
            <EuiImage
              src={http.staticAssets.getPluginAssetHref(previewImage)}
              width={162}
              height={117}
              alt=""
              hasShadow
            />
          )}
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            {actionLinks.map(({ id, title, label, href }) => (
              <EuiFlexItem key={id}>
                <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
                  <EuiText key={id} size="s">
                    <p>{title}</p>
                  </EuiText>
                  <EuiLink
                    data-test-subj={`observabilityOnboardingDataIngestStatusActionLink-${id}`}
                    href={href}
                    target={newTab ? '_blank' : '_self'}
                  >
                    {label}
                  </EuiLink>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.observability_onboarding.dataIngestStatus.findAllPremadeAssetsTextLabel"
          defaultMessage="Find all pre-made assets ready to use {viewAllAssetsLink}"
          values={{
            viewAllAssetsLink: (
              <EuiLink
                target="_blank"
                data-test-subj="observabilityOnboardingDataIngestStatusViewAllAssetsLink"
                href={`${http.basePath.get()}/app/integrations/detail/${integration}/assets`}
              >
                {i18n.translate(
                  'xpack.observability_onboarding.dataIngestStatus.viewAllAssetsLinkText',
                  {
                    defaultMessage: 'View all assets',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
}
