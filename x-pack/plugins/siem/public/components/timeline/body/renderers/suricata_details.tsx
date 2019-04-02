/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { BrowserFields } from '../../../../containers/source';
import { Ecs } from '../../../../graphql/types';

import { AuditdNetflow } from './auditd_netflow';
import { SuricataRefs } from './suricata_refs';
import { SuricataSignature } from './suricata_signature';

const Details = styled.div`
  margin: 10px 0;
`;

export const SuricataDetails = pure<{ browserFields: BrowserFields; data: Ecs }>(
  ({ browserFields, data }) => {
    const signature: string | null = get('suricata.eve.alert.signature', data);
    const signatureId: string | null = get('suricata.eve.alert.signature_id', data);
    if (signatureId != null && signature != null) {
      return (
        <Details>
          <SuricataSignature id={data._id} signature={signature} signatureId={signatureId} />
          <SuricataRefs signatureId={signatureId} />
          <EuiSpacer size="s" />
          <AuditdNetflow data={data} />
        </Details>
      );
    } else {
      return null;
    }
  }
);
