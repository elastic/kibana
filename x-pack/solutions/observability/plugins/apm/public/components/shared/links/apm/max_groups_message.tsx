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

export const OTHER_SERVICE_NAME = '_other';

export function MaxGroupsMessage() {
  return (
    <FormattedMessage
      defaultMessage="The cardinality of APM data being collected is too high. Please review {apmServerDocs} to mitigate the situation."
      id="xpack.apm.tooltip.maxGroup.message"
      values={{
        apmServerDocs: (
          <EuiLink
            data-test-subj="apmMaxGroupsMessageDocsLink"
            href={
              'https://www.elastic.co/guide/en/kibana/8.7/troubleshooting.html#troubleshooting-too-many-transactions'
            }
            target="_blank"
          >
            {i18n.translate('xpack.apm.tooltip.link.apmServerDocs', {
              defaultMessage: 'docs',
            })}
          </EuiLink>
        ),
      }}
    />
  );
}
