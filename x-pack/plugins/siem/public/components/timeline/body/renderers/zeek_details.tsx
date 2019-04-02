/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { BrowserFields } from '../../../../containers/source';
import { Ecs } from '../../../../graphql/types';

import { AuditdNetflow } from './auditd_netflow';
import { ZeekSignature } from './zeek_signature';

const Details = styled.div`
  margin: 10px 0;
`;

export const ZeekDetails = pure<{ browserFields: BrowserFields; data: Ecs }>(
  ({ browserFields, data }) =>
    data.zeek != null ? (
      <Details>
        <ZeekSignature data={data} />
        <EuiSpacer size="s" />
        <AuditdNetflow data={data} />
      </Details>
    ) : null
);
