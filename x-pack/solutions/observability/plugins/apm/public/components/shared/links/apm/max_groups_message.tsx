/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export const OTHER_SERVICE_NAME = '_other';

export function MaxGroupsMessage({ serviceOverflowCount }: { serviceOverflowCount?: number }) {
  const { docLinks } = useApmPluginContext().core;

  const apmServerDocs = (
    <EuiLink
      data-test-subj="apmMaxGroupsMessageDocsLink"
      href={docLinks.links.apm.troubleshootingTooManyTransactions}
      target="_blank"
    >
      {i18n.translate('xpack.apm.tooltip.link.apmServerDocs', {
        defaultMessage: 'docs',
      })}
    </EuiLink>
  );

  if (serviceOverflowCount && serviceOverflowCount > 0) {
    return (
      <FormattedMessage
        defaultMessage="The number of services has exceeded the current capacity. {serviceOverflowCount, plural, one {# additional service is not shown.} other {# additional services are not shown.}} Please review {apmServerDocs} to mitigate the situation."
        id="xpack.apm.tooltip.maxGroup.messageWithOverflowCount"
        values={{ serviceOverflowCount, apmServerDocs }}
      />
    );
  }

  return (
    <FormattedMessage
      defaultMessage="The cardinality of APM data being collected is too high. Please review {apmServerDocs} to mitigate the situation."
      id="xpack.apm.tooltip.maxGroup.message"
      values={{ apmServerDocs }}
    />
  );
}
