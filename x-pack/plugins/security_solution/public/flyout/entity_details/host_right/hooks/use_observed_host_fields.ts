/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import type { HostItem } from '../../../../../common/search_strategy';
import { getAnomaliesFields } from '../../../../timelines/components/side_panel/common';
import type { EntityTableRows } from '../../shared/entity_table/types';
import type { ObservedEntityData } from '../../shared/observed_entity/types';
import { policyFields } from '../fields/endpoint_policy_fields';
import { basicHostFields } from '../fields/basic_host_fields';
import { cloudFields } from '../fields/cloud_fields';

export const useObservedHostFields = (
  hostData: ObservedEntityData<HostItem>
): EntityTableRows<ObservedEntityData<HostItem>> => {
  const mlCapabilities = useMlCapabilities();

  const fields: EntityTableRows<ObservedEntityData<HostItem>> = useMemo(
    () => [
      ...basicHostFields,
      ...getAnomaliesFields(mlCapabilities),
      ...cloudFields,
      ...policyFields,
    ],
    [mlCapabilities]
  );

  if (!hostData.details) return [];

  return fields;
};
