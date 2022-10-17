/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellValueContext, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { isErrorEmbeddable, isFilterableEmbeddable } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { DASHBOARD_CONTAINER_TYPE } from '@kbn/dashboard-plugin/public';
import type { DashboardContainer } from '@kbn/dashboard-plugin/public/application';
import { KibanaServices } from '../../common/lib/kibana';
import { APP_UI_ID } from '../../../common/constants';
import type { SecurityAppStore } from '../../common/store/store';
import { addProvider, showTimeline } from '../../timelines/store/timeline/actions';
import { TimelineId } from '../../../common/types';
import { createDataProviders } from './data_provider';

export const ACTION_ADD_TO_TIMELINE = 'addToTimeline';

function isDashboard(embeddable: IEmbeddable): embeddable is DashboardContainer {
  return embeddable.type === DASHBOARD_CONTAINER_TYPE;
}

export type AddToTimelineActionContext = CellValueContext;

export class AddToTimelineAction implements Action<AddToTimelineActionContext> {
  public readonly type = ACTION_ADD_TO_TIMELINE;
  public readonly id = ACTION_ADD_TO_TIMELINE;
  public order = 1;

  private icon = 'timeline';
  private applicationService;
  private store;

  constructor(store: SecurityAppStore) {
    this.store = store;
    ({ application: this.applicationService } = KibanaServices.get());
  }

  public getDisplayName({ embeddable }: AddToTimelineActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return i18n.translate('dashboard.actions.toggleExpandPanelMenuItem.expandedDisplayName', {
      defaultMessage: 'Add To Timeline',
    });
  }

  public getIconType({ embeddable }: AddToTimelineActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return this.icon;
  }

  public async isCompatible({ embeddable }: AddToTimelineActionContext) {
    if (
      !embeddable.parent ||
      !isDashboard(embeddable.parent) ||
      !isFilterableEmbeddable(embeddable) ||
      isErrorEmbeddable(embeddable)
    ) {
      return false;
    }
    const currentAppId = await new Promise((resolve) => {
      this.applicationService.currentAppId$.subscribe(resolve).unsubscribe();
    });
    return currentAppId === APP_UI_ID;
  }

  public async execute({ embeddable, data }: AddToTimelineActionContext) {
    if (!(await this.isCompatible({ embeddable, data }))) {
      throw new IncompatibleActionError();
    }
    const { field, value, type } = data;

    const dataProviders = createDataProviders({
      contextId: TimelineId.active,
      fieldType: type,
      values: value,
      field,
    });

    if (dataProviders) {
      this.store.dispatch(
        addProvider({
          id: TimelineId.active,
          providers: dataProviders,
        })
      );
      this.store.dispatch(showTimeline({ id: TimelineId.active, show: true }));
    } else {
      // TODO
    }
  }
}
