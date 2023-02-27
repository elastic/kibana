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
  EuiIconTip,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SyntheticsOverviewEmbeddable } from '@kbn/synthetics-plugin/public';

import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

export function ServiceOverviewSyntheticsOverview({
  serviceName,
}: {
  serviceName: string;
}) {
  const { core } = useApmPluginContext();

  return (
    <>
      <EuiPanel hasBorder={true}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.apm.syntheticsOverviewSectionTitle', {
                  defaultMessage: 'Synthetics',
                })}
              </h2>
            </EuiTitle>
            <EuiIconTip
              content={i18n.translate(
                'xpack.apm.syntheticsOverviewSectionTitle.guideText',
                {
                  defaultMessage:
                    'Synthetics monitors dependent on or affected by this service.',
                }
              )}
              position="right"
            />
          </EuiFlexGroup>

          <EuiFlexItem grow={true} />

          <EuiLink
            href={`${
              core?.http?.basePath.get() ?? ''
            }/app/synthetics?serviceNames=${encodeURIComponent(
              JSON.stringify([serviceName])
            )}`}
          >
            <FormattedMessage
              id="xpack.apm.syntheticsOverviewSectionTitle.gotoSynthetics"
              defaultMessage="Goto Synthetics"
            />
          </EuiLink>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <SyntheticsOverviewEmbeddable
          serviceName={serviceName}
          coreStart={core}
        />
      </EuiPanel>
    </>
  );
}
