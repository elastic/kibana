/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import { AppContextTestRender } from '../../../common/mock/endpoint';

/**
 * Forces the `offsetWidth` of `HTMLElement` to a given value. Needed due to the use of
 * `react-virtualized-auto-sizer` by the eui `Selectable` component
 *
 * @param [width=100]
 * @returns reset(): void
 *
 * @example
 * const resetEnv = forceHTMLElementOffsetWidth();
 * //... later
 * resetEnv();
 */
export const forceHTMLElementOffsetWidth = (width: number = 100): (() => void) => {
  const currentOffsetDefinition = Object.getOwnPropertyDescriptor(
    window.HTMLElement.prototype,
    'offsetWidth'
  );

  Object.defineProperties(window.HTMLElement.prototype, {
    offsetWidth: {
      ...(currentOffsetDefinition || {}),
      get() {
        return width;
      },
    },
  });

  return function reset() {
    if (currentOffsetDefinition) {
      Object.defineProperties(window.HTMLElement.prototype, {
        offsetWidth: {
          ...(currentOffsetDefinition || {}),
        },
      });
    }
  };
};

/**
 * Clicks on a policy being displayed when `per policy` is selected.
 * NOTE: ensure that per-policy is selected first. This utility will
 * not do that.
 * @param renderResult
 * @param [atIndex=0]
 */
export const clickOnEffectedPolicy = async (
  renderResult: ReturnType<AppContextTestRender['render']>,
  atIndex: number = 0
): Promise<Element> => {
  const policiesHolderElement = await renderResult.findByTestId(
    'effectedPolicies-select-policiesSelectable'
  );
  const policyElements = policiesHolderElement.querySelectorAll('li.euiSelectableListItem');
  const item = policyElements.item(atIndex);

  if (item) {
    userEvent.click(item);
  }

  return item;
};

/**
 * Returns true or false as to whether an effect policy at a given index in the list is selected or not
 * @param renderResult
 * @param atIndex
 */
export const isEffectedPolicySelected = async (
  renderResult: ReturnType<AppContextTestRender['render']>,
  atIndex: number = 0
): Promise<boolean> => {
  const policiesHolderElement = await renderResult.findByTestId(
    'effectedPolicies-select-policiesSelectable'
  );
  const policyElements = policiesHolderElement.querySelectorAll<HTMLLIElement>(
    'li.euiSelectableListItem'
  );
  const item = policyElements.item(atIndex);

  if (!item) {
    throw new Error(`No policy found in EffectedPolicySelect at index position ${atIndex}`);
  }

  return item.dataset.testSelected === 'true';
};
