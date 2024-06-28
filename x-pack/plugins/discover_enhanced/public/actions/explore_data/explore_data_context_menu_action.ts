/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { Action } from '@kbn/ui-actions-plugin/public';
import { AbstractExploreDataAction } from './abstract_explore_data_action';

export const ACTION_EXPLORE_DATA = 'ACTION_EXPLORE_DATA';

/**
 * This is "Explore underlying data" action which appears in the context
 * menu of a dashboard panel.
 */
export class ExploreDataContextMenuAction
  extends AbstractExploreDataAction
  implements Action<EmbeddableApiContext>
{
  public readonly id = ACTION_EXPLORE_DATA;

  public readonly type = ACTION_EXPLORE_DATA;

  public readonly order = 200;
}
