/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionAgentType } from '../../../common/endpoint/service/response_actions/constants';

export interface IExternalReferenceMetaDataProps {
  externalReferenceMetadata: {
    comment: string;
    command: string;
    targets: Array<{
      endpointId: string;
      hostname: string;
      type: ResponseActionAgentType;
    }>;
  };
}
