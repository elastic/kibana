/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ControlGroupInput, OptionsListEmbeddableInput } from '@kbn/controls-plugin/common';
import type {
  AddOptionsListControlProps,
  ControlGroupContainer,
} from '@kbn/controls-plugin/public';
import type { Filter } from '@kbn/es-query';

export type FilterUrlFormat = Record<
  string,
  Pick<
    OptionsListEmbeddableInput,
    'selectedOptions' | 'title' | 'fieldName' | 'existsSelected' | 'exclude'
  >
>;

export interface FilterContextType {
  allControls: FilterItemObj[] | undefined;
  addControl: (controls: FilterItemObj) => void;
}

export type FilterItemObj = Omit<AddOptionsListControlProps, 'controlId' | 'dataViewId'> & {
  /*
   * Determines the present and order of a control
   *
   * */
  persist?: boolean;
};

export type FilterGroupHandler = ControlGroupContainer;

export type FilterGroupProps = {
  dataViewId: string | null;
  onFilterChange?: (newFilters: Filter[]) => void;
  initialControls: FilterItemObj[];
  spaceId: string;
  onInit?: (controlGroupHandler: FilterGroupHandler | undefined) => void;
  onControlsUpdate?: (controls: FilterItemObj[]) => Promise<void>;
} & Pick<ControlGroupInput, 'timeRange' | 'filters' | 'query' | 'chainingSystem'>;
