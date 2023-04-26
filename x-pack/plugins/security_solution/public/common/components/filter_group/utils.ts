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

export const getPanelsInOrderFromControlsInput = (controlInput: ControlGroupInput) => {
  const panels = controlInput.panels;

  return Object.values(panels).sort((a, b) => a.order - b.order);
};

export const getFilterItemObjListFromControlInput = (controlInput: ControlGroupInput) => {
  const panels = getPanelsInOrderFromControlsInput(controlInput);
  return panels.map((panel) => {
    const {
      explicitInput: { fieldName, selectedOptions, title, existsSelected, exclude },
    } = panel as ControlPanelState<OptionsListEmbeddableInput>;

    return {
      fieldName: fieldName as string,
      selectedOptions: selectedOptions ?? [],
      title,
      existsSelected: existsSelected ?? false,
      exclude: exclude ?? false,
    };
  });
};
