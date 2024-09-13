/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Popover } from '../tabs/common/popover';

const DOCUMENTATION_LINK =
  'https://www.elastic.co/guide/en/observability/current/view-infrastructure-metrics.html';
const SYSTEM_INTEGRATION_DOCS_LINK = 'https://docs.elastic.co/en/integrations/system';

export const TopProcessesTooltip = React.memo(() => {
  return (
    <Popover
      aria-label={i18n.translate('xpack.infra.metrics.nodeDetails.processesHeader.tooltipLabel', {
        defaultMessage: 'More info',
      })}
      iconSize="m"
      icon="iInCircle"
      data-test-subj="infraAssetDetailsProcessesPopoverButton"
    >
      <EuiText size="xs" style={{ width: 300 }}>
        <p>
          <FormattedMessage
            id="xpack.infra.assetDetails.processes.tooltip.topProcesses"
            defaultMessage="The processes listed are based on an aggregation of the top CPU and the top memory consuming processes. It does not show all processes."
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.infra.assetDetails.processes.tooltip.label"
            defaultMessage="The number of top processes is configurable in the {systemIntegration}."
            values={{
              systemIntegration: (
                <EuiLink
                  data-test-subj="infraAssetDetailsTooltipSystemIntegrationDocumentationLink"
                  href={SYSTEM_INTEGRATION_DOCS_LINK}
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.infra.assetDetails.processes.tooltip.systemIntegrationDocumentationLink"
                    defaultMessage="System Integration"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.infra.assetDetails.processes.tooltip.documentationLabel"
            defaultMessage="Please see the following {documentation} for more details on processes."
            values={{
              documentation: (
                <EuiLink
                  data-test-subj="infraAssetDetailsTooltipDocumentationLink"
                  href={DOCUMENTATION_LINK}
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.infra.assetDetails.processes.tooltip.documentationLink"
                    defaultMessage="documentation"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    </Popover>
  );
});
