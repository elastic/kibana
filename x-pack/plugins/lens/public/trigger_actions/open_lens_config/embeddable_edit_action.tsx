/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { Action } from '@kbn/ui-actions-plugin/public';
import { type LensChartLoadEvent } from '@kbn/visualization-utils';
import type { LensPluginStartDependencies } from '../../plugin';
import type { TypedLensByValueInput } from '../../embeddable/embeddable_component';

const ACTION_EDIT_LENS_EMBEDDABLE = 'ACTION_EDIT_LENS_EMBEDDABLE';

interface Context {
  attributes?: TypedLensByValueInput['attributes'];
  id?: string;
  lensEvent?: LensChartLoadEvent;
  onUpdate?: (input: TypedLensByValueInput['attributes']) => void;
  onApply?: (input: TypedLensByValueInput['attributes']) => void;
}

export const getAsyncHelpers = async () => await import('../../async_services');

export class EditLensEmbeddableAction implements Action<Context> {
  public type = ACTION_EDIT_LENS_EMBEDDABLE;
  public id = ACTION_EDIT_LENS_EMBEDDABLE;
  public order = 50;

  constructor(
    protected readonly startDependencies: LensPluginStartDependencies,
    protected readonly core: CoreStart
  ) {}

  public getDisplayName(): string {
    return i18n.translate('xpack.lens.app.editLensEmbeddableLabel', {
      defaultMessage: 'Edit visualization',
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible() {
    // compatible only when ES|QL advanced setting is enabled
    const { isEmbeddableEditActionCompatible } = await getAsyncHelpers();
    return isEmbeddableEditActionCompatible(this.core);
  }

  public async execute({ attributes, id, lensEvent, onUpdate, onApply }: Context) {
    const { executeEditEmbeddableAction } = await getAsyncHelpers();
    if (attributes) {
      executeEditEmbeddableAction({
        deps: this.startDependencies,
        core: this.core,
        attributes,
        embeddableId: id,
        lensEvent,
        onUpdate,
        onApply,
      });
    }
  }
}
