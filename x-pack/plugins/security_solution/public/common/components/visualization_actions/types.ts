/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypedLensByValueInput } from '../../../../../lens/public';
import { InputsModelId } from '../../store/inputs/constants';

export type LensAttributes = TypedLensByValueInput['attributes'];
export type GetLensAttributes = (stackByField?: string) => LensAttributes;

export interface VisualizationActionsProps {
  className?: string;
  getLensAttributes?: GetLensAttributes;
  inputId?: InputsModelId;
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
