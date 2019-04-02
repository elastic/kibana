/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiStat,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { has } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';

import { OverviewHostData } from '../../../../graphql/types';
import { getEmptyTagValue } from '../../../empty_value';

import * as i18n from '../translations';

interface OverviewHostProps {
  data: OverviewHostData;
}

const overviewHostStats = (data: OverviewHostData) => [
  {
    title:
      has('auditbeatAuditd', data) && data.auditbeatAuditd !== null
        ? numeral(data.auditbeatAuditd).format('0,0')
        : getEmptyTagValue(),
    description: i18n.AUDITBEAT_AUDITD,
  },
  {
    title:
      has('auditbeatFIM', data) && data.auditbeatFIM !== null
        ? numeral(data.auditbeatFIM).format('0,0')
        : getEmptyTagValue(),
    description: i18n.AUDITBEAT_FIM,
  },
  {
    title:
      has('auditbeatLogin', data) && data.auditbeatLogin !== null
        ? numeral(data.auditbeatLogin).format('0,0')
        : getEmptyTagValue(),
    description: i18n.AUDITBEAT_LOGIN,
  },
  {
    title:
      has('auditbeatPackage', data) && data.auditbeatPackage !== null
        ? numeral(data.auditbeatPackage).format('0,0')
        : getEmptyTagValue(),
    description: i18n.AUDITBEAT_PACKAGE,
  },
  {
    title:
      has('auditbeatProcess', data) && data.auditbeatProcess !== null
        ? numeral(data.auditbeatProcess).format('0,0')
        : getEmptyTagValue(),
    description: i18n.AUDITBEAT_PROCESS,
  },
  {
    title:
      has('auditbeatUser', data) && data.auditbeatUser !== null
        ? numeral(data.auditbeatUser).format('0,0')
        : getEmptyTagValue(),
    description: i18n.AUDITBEAT_USER,
  },
];
export const OverviewHostStats = pure<OverviewHostProps>(({ data }) => (
  <>
    {overviewHostStats(data).map(item => (
      <EuiStat
        key={item.description}
        textAlign="center"
        title={item.title}
        description={item.description}
      />
    ))}
  </>
));
