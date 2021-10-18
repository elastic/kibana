/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';

import { SearchAfterAndBulkCreateParams, WrapSequences } from '../../signals/types';
import { buildAlertGroupFromSequence } from './utils/build_alert_group_from_sequence';
import { ConfigType } from '../../../../config';
import { WrappedRACAlert } from '../types';

export const wrapSequencesFactory =
  ({
    logger,
    ruleSO,
    ignoreFields,
    mergeStrategy,
    spaceId,
  }: {
    logger: Logger;
    ruleSO: SearchAfterAndBulkCreateParams['ruleSO'];
    ignoreFields: ConfigType['alertIgnoreFields'];
    mergeStrategy: ConfigType['alertMergeStrategy'];
    spaceId: string | null | undefined;
  }): WrapSequences =>
  (sequences, buildReasonMessage) =>
    sequences.reduce(
      (acc: WrappedRACAlert[], sequence) => [
        ...acc,
        ...buildAlertGroupFromSequence(
          logger,
          sequence,
          ruleSO,
          mergeStrategy,
          spaceId,
          buildReasonMessage
        ),
      ],
      []
    );
