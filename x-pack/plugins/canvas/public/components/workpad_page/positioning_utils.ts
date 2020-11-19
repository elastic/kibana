/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PositionedElement, ElementPosition } from '../../../types';
import { multiply, rotateZ, translate } from '../../lib/aeroelastic/matrix';

export const isGroupId = (id: string) => id.startsWith('group');

const headerData = (id: string) =>
  isGroupId(id)
    ? { id, type: 'group', subtype: 'persistentGroup' }
    : { id, type: 'rectangleElement', subtype: '' };

const transformData = ({ top, left, width, height, angle }: ElementPosition, z: number) =>
  multiply(
    translate(left + width / 2, top + height / 2, z), // painter's algo: latest item (highest z) goes to top
    rotateZ((-angle / 180) * Math.PI) // minus angle as transform:matrix3d uses a left-handed coordinate system
  );

/**
 * elementToShape
 *
 * converts a `kibana-canvas` element to an `aeroelastic` shape.
 *
 * Shape: the layout algorithms need to deal with objects through their geometric properties, excluding other aspects,
 * such as what's inside the element, eg. image or scatter plot. This representation is, at its core, a transform matrix
 * that establishes a new local coordinate system https://drafts.csswg.org/css-transforms/#local-coordinate-system plus a
 * size descriptor. There are two versions of the transform matrix:
 *   - `transformMatrix` is analogous to the SVG https://drafts.csswg.org/css-transforms/#current-transformation-matrix
 *   - `localTransformMatrix` is analogous to the SVG https://drafts.csswg.org/css-transforms/#transformation-matrix
 *
 * Element: it also needs to represent the geometry, primarily because of the need to persist it in `redux` and on the
 * server, and to accept such data from the server. The redux and server representations will need to change as more general
 * projections such as 3D are added. The element also needs to maintain its content, such as an image or a plot.
 *
 * While all elements on the current page also exist as shapes, there are shapes that are not elements: annotations.
 * For example, `rotation_handle`, `border_resize_handle` and `border_connection` are modeled as shapes by the layout
 * library, simply for generality.
 */

export const elementToShape = (
  { id, position }: { id: string; position: ElementPosition },
  z: number
) => ({
  ...headerData(id),
  parent: (position && position.parent) || null,
  transformMatrix: transformData(position, z),
  a: position.width / 2, // we currently specify half-width, half-height as it leads to
  b: position.height / 2, // more regular math (like ellipsis radii rather than diameters)
});

const simplePosition = (
  { id, position, filter }: { id: string; position: ElementPosition; filter: string },
  z: number
) => ({
  ...headerData(id),
  width: position.width,
  height: position.height,
  transformMatrix: transformData(position, z),
  filter,
});

export const simplePositioning = ({ elements }: { elements: PositionedElement[] }) => ({
  elements: elements.map(simplePosition),
});
