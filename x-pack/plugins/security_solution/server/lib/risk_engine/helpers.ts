/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { DataViewAttributes } from '@kbn/data-views-plugin/common';
import type { AfterKey, AfterKeys, IdentifierType } from '../../../common/risk_engine';

export const getRiskInputsIndex = async ({
  dataViewId,
  logger,
  soClient,
}: {
  dataViewId: string;
  logger: Logger;
  soClient: SavedObjectsClientContract;
}): Promise<string | undefined> => {
  try {
    const dataView = await soClient.get<DataViewAttributes>('index-pattern', dataViewId);
    return dataView.attributes.title;
  } catch (e) {
    logger.debug(`No dataview found for ID '${dataViewId}'`);
  }
};

export const getFieldForIdentifierAgg = (identifierType: IdentifierType): string =>
  identifierType === 'host' ? 'host.name' : 'user.name';

export const getAfterKeyForIdentifierType = ({
  afterKeys,
  identifierType,
}: {
  afterKeys: AfterKeys;
  identifierType: IdentifierType;
}): AfterKey | undefined => afterKeys[identifierType];
