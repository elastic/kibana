/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The element React Flow renders for a node or an edge, found by comparing its `data-id`. The id
 * is not put into a selector: ids come from the data (a service or group name can hold a quote),
 * and an invalid selector throws.
 */
export const findElementByDataId = (
  root: ParentNode | null | undefined,
  dataId: string
): HTMLElement | undefined => {
  const element = Array.from(root?.querySelectorAll('[data-id]') ?? []).find(
    (candidate) => candidate.getAttribute('data-id') === dataId
  );
  return element instanceof HTMLElement ? element : undefined;
};
