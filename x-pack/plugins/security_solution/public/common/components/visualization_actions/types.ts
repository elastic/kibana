/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';

import type { Status } from '../../../../common/detection_engine/schemas/common';
import type { InputsModelId } from '../../store/inputs/constants';
import type { SourcererScopeName } from '../../store/sourcerer/model';

export type LensAttributes = TypedLensByValueInput['attributes'];
export type GetLensAttributes = (
  stackByField?: string,
  alertsOptions?: AlertsOptions
) => LensAttributes;

export interface VisualizationActionsProps {
  className?: string;
  getLensAttributes?: GetLensAttributes;
  inputId?: InputsModelId.global | InputsModelId.timeline;
  inspectIndex?: number;
  isInspectButtonDisabled?: boolean;
  isMultipleQuery?: boolean;
  lensAttributes?: LensAttributes | null;
  onCloseInspect?: () => void;
  queryId: string;
  stackByField?: string;
  timerange: { from: string; to: string };
  title: React.ReactNode;
}

export interface LensEmbeddableComponentProps {
  alertsOptions?: AlertsOptions;
  extraActions?: Action[];
  getLensAttributes?: GetLensAttributes;
  height?: string;
  id: string;
  inputsModelId?: InputsModelId.global | InputsModelId.timeline;
  inspectTitle?: string;
  lensAttributes?: LensAttributes;
  scopeId?: SourcererScopeName;
  stackByField?: string;
  timerange: { from: string; to: string };
}

export enum RequestStatus {
  PENDING, // The request hasn't finished yet.
  OK, // The request has successfully finished.
  ERROR, // The request failed.
}

export interface Request extends RequestParams {
  id: string;
  name: string;
  json?: object;
  response?: Response;
  startTime: number;
  stats?: RequestStatistics;
  status: RequestStatus;
  time?: number;
}

export interface RequestParams {
  id?: string;
  description?: string;
  searchSessionId?: string;
}

export interface RequestStatistics {
  indexFilter: RequestStatistic;
}

export interface RequestStatistic {
  label: string;
  description?: string;
  value: string;
}

export interface Response {
  json?: { rawResponse?: object };
  time?: number;
}

export interface AlertsOptions {
  showBuildingBlockAlerts?: boolean;
  showOnlyThreatIndicatorAlerts?: boolean;
  status?: Status;
  breakdownField?: string;
}
