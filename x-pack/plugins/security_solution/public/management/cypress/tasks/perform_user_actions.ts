/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ActionTypes = 'click' | 'input' | 'clear';

export interface FormAction {
  type: ActionTypes;
  selector?: string;
  customSelector?: string;
  value?: string;
}

export const performUserActions = (actions: FormAction[]) => {
  for (const action of actions) {
    performAction(action);
  }
};

const performAction = (action: FormAction) => {
  let element;
  if (action.customSelector) {
    element = cy.get(action.customSelector);
  } else {
    element = cy.getByTestSubj(action.selector || '');
  }

  if (action.type === 'click') {
    element.click();
  } else if (action.type === 'input') {
    element.type(action.value || '');
  } else if (action.type === 'clear') {
    element.clear();
  }
};
