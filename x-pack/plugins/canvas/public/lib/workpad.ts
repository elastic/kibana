/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/public';
import { CanvasWorkpad } from '../../types';

export const isWorkpad = (
  workpad: CanvasWorkpad | SavedObject<CanvasWorkpad>
): workpad is CanvasWorkpad =>
  ((workpad as CanvasWorkpad).pages || (workpad as CanvasWorkpad).assets) &&
  !(workpad as SavedObject<CanvasWorkpad>).attributes;

export const isSavedObjectWorkpad = (
  workpad: CanvasWorkpad | SavedObject<CanvasWorkpad>
): workpad is SavedObject<CanvasWorkpad> =>
  Boolean((workpad as SavedObject<CanvasWorkpad>).attributes);
