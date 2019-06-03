/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { FormattedMessage } from '@kbn/i18n/react';
import { has } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OverviewHostData } from '../../../../graphql/types';
import { getEmptyTagValue } from '../../../empty_value';

interface OverviewHostProps {
  data: OverviewHostData;
  loading: boolean;
}

const overviewHostStats = (data: OverviewHostData) => [
  {
    description:
      has('auditbeatAuditd', data) && data.auditbeatAuditd !== null
        ? numeral(data.auditbeatAuditd).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.auditBeatAuditTitle"
        defaultMessage="Auditbeat Audit"
      />
    ),
  },
  {
    description:
      has('auditbeatFIM', data) && data.auditbeatFIM !== null
        ? numeral(data.auditbeatFIM).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.auditBeatFimTitle"
        defaultMessage="Auditbeat File Integrity Module"
      />
    ),
  },
  {
    description:
      has('auditbeatLogin', data) && data.auditbeatLogin !== null
        ? numeral(data.auditbeatLogin).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.auditBeatLoginTitle"
        defaultMessage="Auditbeat Login"
      />
    ),
  },
  {
    description:
      has('auditbeatPackage', data) && data.auditbeatPackage !== null
        ? numeral(data.auditbeatPackage).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.auditBeatPackageTitle"
        defaultMessage="Auditbeat Package"
      />
    ),
  },
  {
    description:
      has('auditbeatProcess', data) && data.auditbeatProcess !== null
        ? numeral(data.auditbeatProcess).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.auditBeatProcessTitle"
        defaultMessage="Auditbeat Process"
      />
    ),
  },
  {
    description:
      has('auditbeatUser', data) && data.auditbeatUser !== null
        ? numeral(data.auditbeatUser).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.auditBeatUserTitle"
        defaultMessage="Auditbeat User"
      />
    ),
  },
  {
    description:
      has('filebeatSystemModule', data) && data.filebeatSystemModule !== null
        ? numeral(data.filebeatSystemModule).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.filebeatSystemModuleTitle"
        defaultMessage="Filebeat System Module"
      />
    ),
  },
  {
    description:
      has('winlogbeat', data) && data.winlogbeat !== null
        ? numeral(data.winlogbeat).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage id="xpack.siem.overview.winlogbeatTitle" defaultMessage="Winlogbeat" />
    ),
  },
];

export const DescriptionListDescription = styled(EuiDescriptionListDescription)`
  text-align: right;
`;

const StatValue = pure<{ isLoading: boolean; value: React.ReactNode | null | undefined }>(
  ({ isLoading, value }) => (
    <>{isLoading ? <EuiLoadingSpinner size="m" /> : value != null ? value : getEmptyTagValue()}</>
  )
);

export const OverviewHostStats = pure<OverviewHostProps>(({ data, loading }) => (
  <EuiDescriptionList type="column">
    {overviewHostStats(data).map((item, index) => (
      <React.Fragment key={index}>
        <EuiDescriptionListTitle>{item.title}</EuiDescriptionListTitle>
        <DescriptionListDescription data-test-subj="stat-loader-description">
          <StatValue isLoading={loading} value={item.description} />
        </DescriptionListDescription>
      </React.Fragment>
    ))}
  </EuiDescriptionList>
));
