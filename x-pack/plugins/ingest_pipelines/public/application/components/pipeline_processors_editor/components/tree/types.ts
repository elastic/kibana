/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessorInternal, ProcessorSelector } from '../../types';

export interface TreeNodeComponentArgs {
  processor: ProcessorInternal;
  selector: ProcessorSelector;
  onMove: () => void;
}

export type RenderTreeItemFunction = (arg: TreeNodeComponentArgs) => React.ReactNode;
