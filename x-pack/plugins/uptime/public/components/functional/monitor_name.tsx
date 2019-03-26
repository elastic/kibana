/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiLink } from '@elastic/eui';
import { get } from 'lodash';
import React, { Fragment } from 'react';
import { LatestMonitor } from '../../../common/graphql/types';

interface MonitorNameProps {
  id: string;
  name?: string | null;
}

export const MonitorName: React.SFC<MonitorNameProps> = ({ id, name }) => {
  return (
    <div>
      <EuiLink href={`#/monitor/${id}`} className="ut-monitor-name">
        {name ? name : <em>[Unnamed]</em>}
      </EuiLink>
    </div>
  );
};
