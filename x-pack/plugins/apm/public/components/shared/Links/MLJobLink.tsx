/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import chrome from 'ui/chrome';
import url from 'url';
import { getMlJobId } from '../../../../common/ml_job_constants';
import { useLocation } from '../../../hooks/useLocation';
import { getRisonString } from './rison_helpers';

interface Props {
  serviceName: string;
  transactionType?: string;
}

export const MLJobLink: React.SFC<Props> = ({
  serviceName,
  transactionType,
  children
}) => {
  const location = useLocation();
  const jobId = getMlJobId(serviceName, transactionType);
  const query = {
    _g: { ml: { jobIds: [jobId] } }
  };

  const risonSearch = getRisonString(location.search, query);

  const href = url.format({
    pathname: chrome.addBasePath('/app/ml'),
    hash: `/timeseriesexplorer?${risonSearch}`
  });

  return <EuiLink children={children} href={href} />;
};
