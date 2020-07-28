/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../../../../common/containers/source';
import { Ecs } from '../../../../../../graphql/types';

import { NetflowRenderer } from '../netflow';
import { SuricataSignature } from './suricata_signature';
import { SuricataRefs } from './suricata_refs';

const Details = styled.div`
  margin: 5px 0;
`;

Details.displayName = 'Details';

export const SuricataDetails = React.memo<{
  browserFields: BrowserFields;
  data: Ecs;
  timelineId: string;
}>(({ data, timelineId }) => {
  const signature: string | null | undefined = get('suricata.eve.alert.signature[0]', data);
  const signatureId: number | null | undefined = get('suricata.eve.alert.signature_id[0]', data);

  if (signatureId != null && signature != null) {
    return (
      <Details>
        <SuricataSignature
          contextId={`suricata-signature-${timelineId}-${data._id}`}
          id={data._id}
          signature={signature}
          signatureId={signatureId}
        />
        <SuricataRefs signatureId={signatureId} />
        <EuiSpacer size="s" />
        <NetflowRenderer data={data} timelineId={timelineId} />
      </Details>
    );
  } else {
    return null;
  }
});

SuricataDetails.displayName = 'SuricataDetails';
