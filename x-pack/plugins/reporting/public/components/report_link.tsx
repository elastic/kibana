/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  getUrl: () => string;
}

export const ReportLink = ({ getUrl }: Props) => (
  <FormattedMessage
    id="xpack.reporting.publicNotifier.reportLink.pickItUpFromPathDescription"
    defaultMessage="Pick it up from {path}."
    values={{
      path: (
        <a href={getUrl()}>
          <FormattedMessage
            id="xpack.reporting.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
            defaultMessage="Management &gt; Kibana &gt; Reporting"
          />
        </a>
      ),
    }}
  />
);
