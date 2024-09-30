/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { Subject } from 'rxjs';
import type { InferenceClient } from '../../../types';
import type { FunctionCallingMode } from '../../../../common/chat_complete';
import { NlToEsqlTaskEvent } from '../types';

export interface ActionsOptionsBase {
  client: Pick<InferenceClient, 'output' | 'chatComplete'>;
  connectorId: string;
  logger: Logger;
  functionCalling?: FunctionCallingMode;
  output$: Subject<NlToEsqlTaskEvent<any>>;
}

/*
      client,
        connectorId,
        functionCalling,
        logger,
        subject,
 */
