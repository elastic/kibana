/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*

import { schema } from '@kbn/config-schema';
import { KibanaRequest, Logger } from 'src/core/server';
import { SavedObject } from 'src/core/types';

import { buildEsQuery, IIndexPattern } from '../../../../../../../src/plugins/data/common';

import { createPersistenceRuleTypeFactory } from '../../../../../rule_registry/server';
import { ML_RULE_TYPE_ID } from '../../../../common/constants';
import { SecurityRuleRegistry } from '../../../plugin';

const createSecurityMlRuleType = createPersistenceRuleTypeFactory<SecurityRuleRegistry>();

import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../alerting/server';
import { ListClient } from '../../../../../lists/server';
import { isJobStarted } from '../../../../common/machine_learning/helpers';
import { ExceptionListItemSchema } from '../../../../common/shared_imports';
import { SetupPlugins } from '../../../plugin';
import { RefreshTypes } from '../types';
import { bulkCreateMlSignals } from '../signals/bulk_create_ml_signals';
import { filterEventsAgainstList } from '../signals/filters/filter_events_against_list';
import { findMlSignals } from '../signals/find_ml_signals';
import { BuildRuleMessage } from '../signals/rule_messages';
import { RuleStatusService } from '../signals/rule_status_service';
import { MachineLearningRuleAttributes } from '../signals/types';
import { createErrorsFromShard, createSearchAfterReturnType, mergeReturns } from '../signals/utils';

export const mlAlertType = createSecurityMlRuleType({
  id: ML_RULE_TYPE_ID,
  name: 'Machine Learning Rule',
  validate: {
    params: schema.object({
      indexPatterns: schema.arrayOf(schema.string()),
      customQuery: schema.string(),
    }),
  },
  actionGroups: [
    {
      id: 'default',
      name: 'Default',
    },
  ],
  defaultActionGroupId: 'default',
  actionVariables: {
    context: [{ name: 'server', description: 'the server' }],
  },
  minimumLicenseRequired: 'basic',
  isExportable: false,
  producer: 'security-solution',
  async executor({
    services: { alertWithPersistence, findAlerts },
    params: { indexPatterns, customQuery },
  }) {
    return {
      lastChecked: new Date(),
    };
  },
});
*/
