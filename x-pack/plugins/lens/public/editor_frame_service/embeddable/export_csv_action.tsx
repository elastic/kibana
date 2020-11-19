/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormatFactory } from 'src/plugins/data/common/field_formats/utils';
import { DataPublicPluginStart, exportAsCSVs } from '../../../../../../src/plugins/data/public';
import { Adapters, IEmbeddable } from '../../../../../../src/plugins/embeddable/public';
import { Action } from '../../../../../../src/plugins/ui_actions/public';
import { CoreStart } from '../../../../../../src/core/public';

export const ACTION_EXPORT_CSV = 'ACTION_EXPORT_CSV';

export interface Params {
  core: CoreStart;
  data: DataPublicPluginStart;
}

export interface ExportContext {
  embeddable?: IEmbeddable;
  // used for testing
  asString?: boolean;
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
    return Boolean(
      context.embeddable &&
        'getInspectorAdapters' in context.embeddable &&
        this.hasDatatableContent(context.embeddable.getInspectorAdapters())
    );
  }

  private hasDatatableContent = (adapters: Adapters | undefined) => {
    return adapters && (adapters.data || adapters[Object.keys(adapters)[0]]?.columns);
  };

  private getFormatter = (
    type: string | undefined,
    adapters: Adapters | undefined
  ): FormatFactory | undefined => {
    if (type === 'lens') {
      return this.params.data.fieldFormats.deserialize;
    }

    if (type === 'visualize') {
      return (() => ({
        convert: (item: { raw: string; formatted: string }) => item.formatted,
      })) as FormatFactory;
    }

    if (this.hasDatatableContent(adapters)) {
      // if of unknown type, return an identity
      return (() => ({
        convert: (item) => item,
      })) as FormatFactory;
    }
  };

  private getDataTableContent = async (
    type: string | undefined,
    adapters: Adapters | undefined
  ) => {
    if (!adapters || !type) {
      return;
    }
    // Visualize
    if (type === 'visualize') {
      const datatable = await adapters.data.tabular();
      datatable.columns = datatable.columns.map(({ field, ...rest }: { field: string }) => ({
        id: field,
        field,
        ...rest,
      }));
      return { layer1: datatable };
    }
    // Lens
    if (type === 'lens') {
      return adapters;
    }
    // Make a last attempt to duck type the adapter (useful for testing)
    if (this.hasDatatableContent(adapters)) {
      return adapters;
    }
    return;
  };

  private exportCSV = async (context: ExportContext) => {
    const formatFactory = this.getFormatter(
      context?.embeddable?.type,
      context?.embeddable?.getInspectorAdapters()
    );
    // early exit if not formatter is available
    if (!formatFactory) {
      return;
    }
    const datatables = await this.getDataTableContent(
      context?.embeddable?.type,
      context?.embeddable?.getInspectorAdapters()
    );

    if (datatables) {
      return exportAsCSVs(context?.embeddable?.getTitle()!, datatables, {
        csvSeparator: this.params.core.uiSettings.get('csv:separator', ','),
        quoteValues: this.params.core.uiSettings.get('csv:quoteValues', true),
        formatFactory,
        asString: context.asString,
      });
    }
  };

  public async execute(context: ExportContext): Promise<void> {
    // make it testable: type here will be forced
    return ((await this.exportCSV(context)) as unknown) as Promise<void>;
  }
}
