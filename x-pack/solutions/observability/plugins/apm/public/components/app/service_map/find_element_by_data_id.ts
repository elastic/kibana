/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The element React Flow renders for a node, found by comparing its `data-id`. The id is not put
 * into a selector: ids come from the data (a service or group name can hold a quote), and an invalid
 * selector throws. React Flow puts `data-id` on the SVG element of an edge too, and an edge id can
 * be the same as a node id, so only HTML elements, which nodes are, are looked at.
 */
export const findElementByDataId = (
  root: ParentNode | null | undefined,
  dataId: string
): HTMLElement | undefined =>
  Array.from(root?.querySelectorAll('[data-id]') ?? []).find(
    (candidate): candidate is HTMLElement =>
      candidate instanceof HTMLElement && candidate.getAttribute('data-id') === dataId
  );
