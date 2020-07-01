/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MLLink } from './MLLink';

interface Props {
  jobId: string;
  external?: boolean;
}

export const MLJobLink: React.FC<Props> = (props) => {
  const query = {
    ml: { jobIds: [props.jobId] },
  };

  return (
    <MLLink
      children={props.children}
      query={query}
      path="/timeseriesexplorer"
      external={props.external}
    />
  );
};
