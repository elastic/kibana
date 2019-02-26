/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';

import { EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { Ecs } from '../../../../graphql/types';
import { SourceDest } from './source_dest_ip';
import { SuricataRefs } from './suricata_refs';
import { SuricataSignature } from './suricata_signature';

const Details = styled.div`
  margin-top: 10px;
  margin-bottom: 10px;
`;

export const SuricataDetails = pure(({ data }: { data: Ecs }) => {
  const signature: string | null = get('suricata.eve.alert.signature', data);
  const signatureId: string | null = get('suricata.eve.alert.signature_id', data);
  if (signatureId != null && signature != null) {
    return (
      <Details>
        <SuricataSignature id={data._id} signature={signature} signatureId={signatureId} />
        <SuricataRefs signature={signature} signatureId={signatureId} />
        <EuiSpacer size="s" />
        <SourceDest data={data} />
      </Details>
    );
  } else {
    return null;
  }
});
