/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiButtonEmpty,
} from '@elastic/eui';
import { apmLight } from '@kbn/shared-svg';
import { FormattedMessage } from '@kbn/i18n-react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export function AddAPMCallOut() {
  const { core } = useApmPluginContext();

  return (
    <EuiPanel color="subdued" hasShadow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexStart">
        <EuiFlexItem grow={0}>
          <EuiImage
            css={{
              background: '#FFFFFF',
            }}
            width="160"
            height="100"
            size="m"
            src={apmLight}
            alt="apm-logo"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          <EuiTitle size="xs">
            <h1>
              <FormattedMessage
                id="xpack.apm.portalPanel.zeroProjects.title"
                defaultMessage="Detect and resolve issues faster with deep visibility into your application"
              />
            </h1>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.apm.portalPanel.zeroProjects.title"
                defaultMessage="Understanding your application performance, relationships and dependencies by
    instrumenting with APM."
              />
            </p>
          </EuiText>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <div>
            <EuiButton data-test-subj="" href={core.http.basePath.prepend('/app/apm/tutorial')}>
              {i18n.translate('xpack.apm.logsServiceOverview.callout.addApm', {
                defaultMessage: 'Add APM',
              })}
            </EuiButton>
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="apmAddAPMCallOutLearnMoreButton"
            iconType="popout"
            iconSide="right"
            idata-test-subj="apmAddAPMCallOutLearnMore"
            href="https://www.elastic.co/observability/application-performance-monitoring"
          >
            {i18n.translate('xpack.apm.addAPMCallOut.linkToElasticcoButtonEmptyLabel', {
              defaultMessage: 'Learn more',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
