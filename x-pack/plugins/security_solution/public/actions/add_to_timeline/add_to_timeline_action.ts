/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellValueContext } from '@kbn/embeddable-plugin/public';
import { isErrorEmbeddable, isFilterableEmbeddable } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { KibanaServices } from '../../common/lib/kibana';
import type { SecurityAppStore } from '../../common/store/types';
import { addProvider, showTimeline } from '../../timelines/store/timeline/actions';
import type { DataProvider } from '../../../common/types';
import { TimelineId } from '../../../common/types';
import { createDataProviders } from './data_provider';
import { fieldHasCellActions, isInSecurityApp, isLensEmbeddable } from '../utils';

export const ACTION_ID = 'addToTimeline';

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

export class AddToTimelineAction implements Action<CellValueContext> {
  public readonly type = ACTION_ID;
  public readonly id = ACTION_ID;
  public order = 1;

  private icon = 'timeline';
  private applicationService;
  private toastsService;
  private store;

  constructor(store: SecurityAppStore) {
    this.store = store;
    ({
      application: this.applicationService,
      notifications: { toasts: this.toastsService },
    } = KibanaServices.get());
  }

  public getDisplayName() {
    return i18n.translate('xpack.securitySolution.actions.cellValue.addToTimeline.displayName', {
      defaultMessage: 'Add to timeline',
    });
  }

  public getIconType() {
    return this.icon;
  }

  public async isCompatible({ embeddable, data }: CellValueContext) {
    if (
      isErrorEmbeddable(embeddable) ||
      !isLensEmbeddable(embeddable) ||
      !isFilterableEmbeddable(embeddable) ||
      !isDataColumnsFilterable(data)
    ) {
      return false;
    }
    return isInSecurityApp(this.applicationService);
  }

  public async execute({ data }: CellValueContext) {
    const dataProviders = data.reduce<DataProvider[]>((acc, { columnMeta, value }) => {
      const dataProvider = createDataProviders({
        contextId: TimelineId.active,
        fieldType: columnMeta?.type,
        values: value,
        field: columnMeta?.field,
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
        title: i18n.translate(
          'xpack.securitySolution.actions.cellValue.addToTimeline.warningTitle',
          { defaultMessage: 'Unable to add to timeline' }
        ),
        text: i18n.translate(
          'xpack.securitySolution.actions.cellValue.addToTimeline.warningMessage',
          { defaultMessage: 'Filter received is empty or can not be added to timeline' }
        ),
      });
    }
  }
}
