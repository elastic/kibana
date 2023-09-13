/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { type CoreStart, IUiSettingsClient } from '@kbn/core/public';

export interface SloEmbeddableExplicitInput {
  slo: SLOWithSummaryResponse;
}

export interface SloConfigurationProps {
  onCreate: (props: SloEmbeddableExplicitInput) => void;
  onCancel: () => void;
}

export type SloEmbeddableInput = EmbeddableInput & SloEmbeddableExplicitInput;

export interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  application: ApplicationStart;
}
