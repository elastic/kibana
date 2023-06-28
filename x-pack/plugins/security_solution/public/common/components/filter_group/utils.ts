/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ControlGroupInput,
  ControlPanelState,
  OptionsListEmbeddableInput,
} from '@kbn/controls-plugin/common';

import { isEmpty, isEqual } from 'lodash';
import type { FilterItemObj } from './types';

export const getPanelsInOrderFromControlsInput = (controlInput: ControlGroupInput) => {
  const panels = controlInput.panels;

  return Object.values(panels).sort((a, b) => a.order - b.order);
};

export const getFilterItemObjListFromControlInput = (controlInput: ControlGroupInput) => {
  const panels = getPanelsInOrderFromControlsInput(controlInput);
  return panels.map((panel) => {
    const {
      explicitInput: { fieldName, selectedOptions, title, existsSelected, exclude, hideActionBar },
    } = panel as ControlPanelState<OptionsListEmbeddableInput>;

    return {
      fieldName: fieldName as string,
      selectedOptions: selectedOptions ?? [],
      title,
      existsSelected: existsSelected ?? false,
      exclude: exclude ?? false,
      hideActionBar: hideActionBar ?? false,
    };
  });
};

interface MergableControlsArgs {
  /*
   * Set of controls that need be merged with priority
   * Set of controls with lower index take priority over the next one.
   *
   * Final set of controls is merged with the defaulControls
   *
   */
  controlsWithPriority: FilterItemObj[][];
  defaultControlsObj: Record<string, FilterItemObj>;
}

/*
 * mergeControls merges controls based on priority with the default controls
 *
 * @return undefined if all provided controls are empty
 * */
export const mergeControls = ({
  controlsWithPriority,
  defaultControlsObj,
}: MergableControlsArgs) => {
  const highestPriorityControlSet = controlsWithPriority.find((control) => !isEmpty(control));

  return highestPriorityControlSet?.map((singleControl) => {
    if (singleControl.fieldName in defaultControlsObj) {
      return {
        ...defaultControlsObj[singleControl.fieldName],
        ...singleControl,
      };
    }
    return singleControl;
  });
};

interface ReorderControlsArgs {
  /*
   * Ordered Controls
   *
   * */
  controls: FilterItemObj[];
  /*
   * default controls in order
   * */
  defaultControls: FilterItemObj[];
}

/**
 * reorderControlsWithPersistentControls reorders the controls such that controls which
 * are persistent in default controls should be upserted in given order
 *
 * */
export const reorderControlsWithDefaultControls = (args: ReorderControlsArgs) => {
  const { controls, defaultControls } = args;
  const controlsObject = controls.reduce((prev, current) => {
    prev[current.fieldName] = current;
    return prev;
  }, {} as Record<string, FilterItemObj>);

  const defaultControlsObj = defaultControls.reduce((prev, current) => {
    prev[current.fieldName] = current;
    return prev;
  }, {} as Record<string, FilterItemObj>);

  const resultDefaultControls: FilterItemObj[] = defaultControls
    .filter((defaultControl) => defaultControl.persist)
    .map((defaultControl) => {
      return {
        ...defaultControl,
        ...(controlsObject[defaultControl.fieldName] ?? {}),
      };
    });

  const resultNonPersitantControls = controls
    .filter(
      // filter out persisting controls since we have already taken
      // in account above
      (control) => !defaultControlsObj[control.fieldName]?.persist
    )
    .map((control) => ({
      // insert some default properties from default controls
      // irrespective of whether they are persistent or not.
      ...(defaultControlsObj[control.fieldName] ?? {}),
      ...control,
    }));

  return [...resultDefaultControls, ...resultNonPersitantControls];
};

export const getFilterControlsComparator =
  (...fieldsToCompare: Array<keyof FilterItemObj>) =>
  (value1: FilterItemObj[], value2: FilterItemObj[]) => {
    if (value1.length !== value2.length) return false;
    const valmod1 = value1.map((v) => {
      return fieldsToCompare.reduce((prev, current) => {
        const result = {
          ...prev,
          [current]: v[current],
        };
        return result;
      }, {} as FilterItemObj);
    });

    const valmod2 = value2.map((v) => {
      return fieldsToCompare.reduce((prev, current) => {
        const result = {
          ...prev,
          [current]: v[current],
        };
        return result;
      }, {} as FilterItemObj);
    });

    return isEqual(valmod1, valmod2);
  };
