/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InPortal } from 'react-reverse-portal';
import { GetSLOResponse } from '@kbn/slo-schema';
import { CreateSLOForm } from '../../types';
import { SLOInspectWrapper } from './slo_inspect';
import { InspectSLOPortalNode } from '../../slo_edit';

export interface SloInspectPortalProps {
  getValues: () => CreateSLOForm;
  trigger: () => Promise<boolean>;
  slo?: GetSLOResponse;
}
export function InspectSLOPortal(props: SloInspectPortalProps) {
  return (
    <InPortal node={InspectSLOPortalNode}>
      <SLOInspectWrapper {...props} />
    </InPortal>
  );
}
