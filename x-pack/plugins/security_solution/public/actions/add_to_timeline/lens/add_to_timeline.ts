/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellValueContext } from '@kbn/embeddable-plugin/public';
import { isErrorEmbeddable, isFilterableEmbeddable } from '@kbn/embeddable-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { KibanaServices } from '../../../common/lib/kibana';
import type { SecurityAppStore } from '../../../common/store/types';
import { addProvider, showTimeline } from '../../../timelines/store/timeline/actions';
import type { DataProvider } from '../../../../common/types';
import { TimelineId } from '../../../../common/types';
import { fieldHasCellActions, isInSecurityApp, isLensEmbeddable } from '../../utils';
import {
  ADD_TO_TIMELINE,
  ADD_TO_TIMELINE_FAILED_TEXT,
  ADD_TO_TIMELINE_FAILED_TITLE,
  ADD_TO_TIMELINE_ICON,
} from '../constants';
import { createDataProviders } from '../data_provider';

export const ACTION_ID = 'embeddable_addToTimeline';

function isDataColumnsFilterable(data?: CellValueContext['data']): boolean {
  return (
    !!data &&
    data.length > 0 &&
    data.every(
      ({ columnMeta }) =>
        columnMeta &&
        fieldHasCellActions(columnMeta.field) &&
        columnMeta.source === 'esaggs' &&
        columnMeta.sourceParams?.indexPatternId
    )
  );
}

export class LensAddToTimelineAction implements Action<CellValueContext> {
  public readonly type = ACTION_ID;
  public readonly id = ACTION_ID;
  public order = 1;

  private icon = ADD_TO_TIMELINE_ICON;
  private toastsService;
  private store;
  private currentAppId: string | undefined;

  constructor(store: SecurityAppStore) {
    this.store = store;
    const { application, notifications } = KibanaServices.get();
    this.toastsService = notifications.toasts;

    application.currentAppId$.subscribe((currentAppId) => {
      this.currentAppId = currentAppId;
    });
  }

  public getDisplayName() {
    return ADD_TO_TIMELINE;
  }

  public getIconType() {
    return this.icon;
  }

  public async isCompatible({ embeddable, data }: CellValueContext) {
    return (
      !isErrorEmbeddable(embeddable) &&
      isLensEmbeddable(embeddable) &&
      isFilterableEmbeddable(embeddable) &&
      isDataColumnsFilterable(data) &&
      isInSecurityApp(this.currentAppId)
    );
  }

  public async execute({ data }: CellValueContext) {
    const dataProviders = data.reduce<DataProvider[]>((acc, { columnMeta, value, eventId }) => {
      const dataProvider = createDataProviders({
        contextId: TimelineId.active,
        fieldType: columnMeta?.type,
        values: value,
        field: columnMeta?.field,
        eventId,
      });
      if (dataProvider) {
        acc.push(...dataProvider);
      }
      return acc;
    }, []);

    if (dataProviders.length > 0) {
      this.store.dispatch(addProvider({ id: TimelineId.active, providers: dataProviders }));
      this.store.dispatch(showTimeline({ id: TimelineId.active, show: true }));
    } else {
      this.toastsService.addWarning({
        title: ADD_TO_TIMELINE_FAILED_TITLE,
        text: ADD_TO_TIMELINE_FAILED_TEXT,
      });
    }
  }
}
