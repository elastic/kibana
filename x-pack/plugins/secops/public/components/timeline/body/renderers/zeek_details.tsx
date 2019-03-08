/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Ecs } from '../../../../graphql/types';

import { SourceDest } from './source_dest_ip';
import { ZeekSignature } from './zeek_signature';

const Details = styled.div`
  margin-top: 10px;
  margin-bottom: 10px;
`;

export const ZeekDetails = pure<{ data: Ecs }>(({ data }) =>
  data.zeek != null ? (
    <Details>
      <ZeekSignature data={data} />
      <EuiSpacer size="s" />
      <SourceDest data={data} />
    </Details>
  ) : null
);
