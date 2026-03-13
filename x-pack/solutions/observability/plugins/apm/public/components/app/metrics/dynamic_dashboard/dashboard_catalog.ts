/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PanelBuilder } from '../metrics_dashboard/types';
import { getOtelOtherJavaPanels } from '../metrics_dashboard/panels/jvm_panels';

type VersionPanels = Partial<Record<string, PanelBuilder>> & { default: PanelBuilder };
type LanguagePanels = Partial<Record<string, VersionPanels>>;
type SdkNamePanels = Partial<Record<string, LanguagePanels>>;
type PanelsCatalog = Partial<Record<string, SdkNamePanels>>;

export const panelsCatalog: PanelsCatalog = {
  otel_native: {
    otel_other: {
      java: {
        default: getOtelOtherJavaPanels,
      },
    },
  },
};

export const getPanelBuilder = (
  dataFormat: string,
  sdkName: string,
  language: string,
  version?: string
): PanelBuilder | undefined => {
  const dashboard = panelsCatalog[dataFormat]?.[sdkName]?.[language];

  if (!dashboard) {
    return undefined;
  }

  if (version && dashboard[version]) {
    return dashboard[version];
  }

  return dashboard.default;
};
