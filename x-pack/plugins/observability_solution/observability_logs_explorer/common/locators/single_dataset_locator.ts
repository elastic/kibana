/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { UnresolvedDatasetSelection } from '@kbn/logs-explorer-plugin/common';
import type { IndexPattern } from '@kbn/io-ts-utils';
import {
  SingleDatasetLocatorParams,
  SINGLE_DATASET_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { ObsLogsExplorerLocatorDependencies } from './types';
import { constructLocatorPath } from './utils';

export type SingleDatasetLocator = LocatorPublic<SingleDatasetLocatorParams>;

export class SingleDatasetLocatorDefinition
  implements LocatorDefinition<SingleDatasetLocatorParams>
{
  public readonly id = SINGLE_DATASET_LOCATOR_ID;

  constructor(protected readonly deps: ObsLogsExplorerLocatorDependencies) {}

  public readonly getLocation = (params: SingleDatasetLocatorParams) => {
    const { useHash } = this.deps;
    const { integration, dataset, selector = '' } = params;

    const datasetPattern = this.composeIndexPattern(dataset, selector);

    const unresolvedDatasetSelection = UnresolvedDatasetSelection.fromSelection({
      name: integration,
      dataset: {
        name: datasetPattern,
        title: selector !== '' ? `${datasetPattern.split('-')[1]}${selector}` : undefined,
      },
    });

    return constructLocatorPath({
      dataSourceSelection: unresolvedDatasetSelection.toPlainSelection(),
      locatorParams: params,
      useHash,
    });
  };

  private composeIndexPattern(
    datasetName: SingleDatasetLocatorParams['dataset'],
    selector: string
  ) {
    return `logs-${datasetName}-*${selector}` as IndexPattern;
  }
}
