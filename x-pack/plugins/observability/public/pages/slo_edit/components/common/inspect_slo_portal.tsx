/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import { InPortal } from 'react-reverse-portal';
import { InspectSLOPortalNode } from '../../slo_edit';
import { SLOInspectWrapper } from './slo_inspect';

export interface Props {
  slo?: GetSLOResponse;
}

export function InspectSLOPortal({ slo }: Props) {
  return (
    <InPortal node={InspectSLOPortalNode}>
      <SLOInspectWrapper slo={slo} />
    </InPortal>
  );
}
