/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { IEmbeddable } from 'src/plugins/embeddable/public';
// import { StartServicesGetter } from 'src/plugins/kibana_utils/public';
import { Action } from 'src/plugins/ui_actions/public';

export const ACTION_EXPORT_CSV = 'ACTION_EXPORT_CSV';

export interface Params {
  //   start: StartServicesGetter<unknown, unknown, unknown>;
}

interface ExportContext {
  embeddable?: IEmbeddable;
}

/**
 * This is "Export CSV" action which appears in the context
 * menu of a dashboard panel.
 */
export class ExportCSVAction implements Action<ExportContext, typeof ACTION_EXPORT_CSV> {
  public readonly id = ACTION_EXPORT_CSV;

  public readonly type = ACTION_EXPORT_CSV;

  public readonly order = 200;

  constructor(protected readonly params: Params) {}

  public getIconType() {
    return 'exportAction';
  }

  public readonly getDisplayName = (context: ExportContext): string =>
    i18n.translate('xpack.lens.DownloadCreateDrilldownAction.displayName', {
      defaultMessage: 'Download as CSV',
    });

  public async isCompatible(context: ExportContext): Promise<boolean> {
    return context.embeddable?.type === 'lens';
  }

  protected readonly exportCSV = async (context: ExportContext): Promise<void> => {
    // Call the Export CSV method on Lens here
    console.log('Export CSV');
  };

  public async execute(context: ExportContext): Promise<void> {
    // const { core } = this.params.start();

    await this.exportCSV(context);
  }
}
