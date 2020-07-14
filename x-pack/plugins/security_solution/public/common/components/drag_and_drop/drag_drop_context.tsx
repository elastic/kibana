/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/40309

import { MovementMode, DraggableId } from 'react-beautiful-dnd';

export interface BeforeCapture {
  draggableId: DraggableId;
  mode: MovementMode;
}
