/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText } from '@elastic/eui';

const bodyDocsLink =
  'https://www.elastic.co/guide/en/beats/heartbeat/current/configuration-heartbeat-options.html#monitor-http-response';

export const DocLinkForBody = () => {
  const docsLink = (
    <EuiLink href={bodyDocsLink} target="_blank">
      {i18n.translate('xpack.uptime.pingList.drawer.body.docsLink', {
        defaultMessage: 'docs',
        description: 'Docs link to set response body',
      })}
    </EuiLink>
  );

  return (
    <EuiText>
      <FormattedMessage
        id="xpack.uptime.pingList.expandedRow.response_body.notRecorded"
        defaultMessage="Body not recorded. Read our {docsLink} for more information on recording response bodies."
        values={{ docsLink }}
      />
    </EuiText>
  );
};
