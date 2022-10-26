/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { InputsModelId } from '../../store/inputs/constants';

export type LensAttributes = TypedLensByValueInput['attributes'];
export type GetLensAttributes = (stackByField?: string) => LensAttributes;

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
  getLensAttributes?: GetLensAttributes;
  height?: string;
  id: string;
  inputsModelId?: InputsModelId;
  inspectTitle?: string;
  lensAttributes: LensAttributes;
  metricAlignment?: 'left' | 'center';
  stackByField?: string;
  timerange: { from: string; to: string };
}

export enum RequestStatus {
  /**
   * The request hasn't finished yet.
   */
  PENDING,
  /**
   * The request has successfully finished.
   */
  OK,
  /**
   * The request failed.
   */
  ERROR,
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
  [key: string]: RequestStatistic;
}

export interface RequestStatistic {
  label: string;
  description?: string;
  value: unknown;
}

export interface Response {
  json?: object;
  time?: number;
}
