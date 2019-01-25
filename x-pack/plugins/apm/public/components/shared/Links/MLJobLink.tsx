/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import { Location } from 'history';
import React from 'react';
import { getKibanaHref } from './url_helpers';

interface Props {
  serviceName: string;
  transactionType?: string;
  location: Location;
}

export const MLJobLink: React.SFC<Props> = ({
  serviceName,
  transactionType,
  location,
  children
}) => {
  const pathname = '/app/ml';
  const hash = '/timeseriesexplorer';
  const maybeTransactionType = transactionType ? transactionType + '-' : '';
  const jobId = `${serviceName}-${maybeTransactionType}high_mean_response_time`;
  const query = {
    _g: { ml: { jobIds: [jobId] } }
  };

  const href = getKibanaHref({
    location,
    pathname,
    hash,
    query
  });
  return <EuiLink children={children} href={href} />;
};
