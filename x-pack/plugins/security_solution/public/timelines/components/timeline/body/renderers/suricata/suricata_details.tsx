/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { Ecs } from '../../../../../../../common/ecs';

import { NetflowRenderer } from '../netflow';
import { SuricataSignature } from './suricata_signature';
import { SuricataRefs } from './suricata_refs';

const Details = styled.div`
  margin: 5px 0;
`;

Details.displayName = 'Details';

export const SuricataDetails = React.memo<{
  data: Ecs;
  isDraggable?: boolean;
  timelineId: string;
}>(({ data, isDraggable, timelineId }) => {
  const signature: string | null | undefined = get('suricata.eve.alert.signature[0]', data);
  const signatureId: number | null | undefined = get('suricata.eve.alert.signature_id[0]', data);

  if (signatureId != null && signature != null) {
    return (
      <Details>
        <SuricataSignature
          contextId={`suricata-signature-${timelineId}-${data._id}`}
          id={data._id}
          isDraggable={isDraggable}
          signature={signature}
          signatureId={signatureId}
        />
        <SuricataRefs signatureId={signatureId} />
        <EuiSpacer size="s" />
        <NetflowRenderer data={data} isDraggable={isDraggable} timelineId={timelineId} />
      </Details>
    );
  } else {
    return null;
  }
});

SuricataDetails.displayName = 'SuricataDetails';
