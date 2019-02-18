/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowEqual } from 'recompose';
import { invert, matrixToAngle, multiply, rotateZ, translate } from '../../lib/aeroelastic/matrix';
import { arrayToMap, identity } from '../../lib/aeroelastic/functional';

export const aeroelasticConfiguration = {
  getAdHocChildAnnotationName: 'adHocChildAnnotation',
  adHocGroupName: 'adHocGroup',
  alignmentGuideName: 'alignmentGuide',
  atopZ: 1000,
  depthSelect: true,
  devColor: 'magenta',
  dragBoxAnnotationName: 'dragBoxAnnotation',
  dragBoxZ: 1050, // above alignment guides but below the upcoming hover tooltip
  groupName: 'group',
  groupResize: true,
  guideDistance: 3,
  hoverAnnotationName: 'hoverAnnotation',
  hoverLift: 100,
  intraGroupManipulation: false,
  intraGroupSnapOnly: false,
  minimumElementSize: 0,
  persistentGroupName: 'persistentGroup',
  resizeAnnotationConnectorOffset: 0,
  resizeAnnotationOffset: 0,
  resizeAnnotationOffsetZ: 0.1, // causes resize markers to be slightly above the shape plane
  resizeAnnotationSize: 10,
  resizeConnectorName: 'resizeConnector',
  resizeHandleName: 'resizeHandle',
  rotateAnnotationOffset: 12,
  rotateSnapInPixels: 10,
  rotationEpsilon: 0.001,
  rotationHandleName: 'rotationHandle',
  rotationHandleSize: 14,
  rotationTooltipName: 'rotationTooltip',
  shortcuts: false,
  singleSelect: false,
  snapConstraint: true,
  tooltipZ: 1100,
};

export const makeUid = () => 1e11 + Math.floor((1e12 - 1e11) * Math.random());

// check for duplication
const deduped = a => a.filter((d, i) => a.indexOf(d) === i);
export const idDuplicateCheck = groups => {
  if (deduped(groups.map(g => g.id)).length !== groups.length) {
    throw new Error('Duplicate element encountered');
  }
};

export const missingParentCheck = groups => {
  const idMap = arrayToMap(groups.map(g => g.id));
  groups.forEach(g => {
    if (g.parent && !idMap[g.parent]) {
      g.parent = null;
    }
  });
};

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
export const elementToShape = (element, i) => {
  const position = element.position;
  const a = position.width / 2;
  const b = position.height / 2;
  const cx = position.left + a;
  const cy = position.top + b;
  const z = i; // painter's algo: latest item goes to top
  // multiplying the angle with -1 as `transform: matrix3d` uses a left-handed coordinate system
  const angleRadians = (-position.angle / 180) * Math.PI;
  const transformMatrix = multiply(translate(cx, cy, z), rotateZ(angleRadians));
  const isGroup = element.id.startsWith('group');
  const parent = (element.position && element.position.parent) || null; // reserved for hierarchical (tree shaped) grouping
  return {
    id: element.id,
    type: isGroup ? 'group' : 'rectangleElement',
    subtype: isGroup ? 'persistentGroup' : '',
    parent,
    transformMatrix,
    a, // we currently specify half-width, half-height as it leads to
    b, // more regular math (like ellipsis radii rather than diameters)
  };
};

export const shapeToElement = shape => {
  let angle = Math.round((matrixToAngle(shape.transformMatrix) * 180) / Math.PI);
  if (1 / angle === -Infinity) {
    angle = 0;
  }
  return {
    left: shape.transformMatrix[12] - shape.a,
    top: shape.transformMatrix[13] - shape.b,
    width: shape.a * 2,
    height: shape.b * 2,
    angle,
    parent: shape.parent || null,
    type: shape.type === 'group' ? 'group' : 'element',
  };
};

export const updateGlobalPositions = (setPositions, { shapes, gestureEnd }, unsortedElements) => {
  const ascending = (a, b) => (a.id < b.id ? -1 : 1);
  const relevant = s => s.type !== 'annotation' && s.subtype !== 'adHocGroup';
  const elements = unsortedElements.filter(relevant).sort(ascending);
  const repositionings = shapes
    .filter(relevant)
    .sort(ascending)
    .map((shape, i) => {
      const element = elements[i];
      const elemPos = element && element.position;
      if (elemPos && gestureEnd) {
        // get existing position information from element
        const oldProps = {
          left: elemPos.left,
          top: elemPos.top,
          width: elemPos.width,
          height: elemPos.height,
          angle: Math.round(elemPos.angle),
          type: elemPos.type,
          parent: elemPos.parent || null,
        };

        // cast shape into element-like object to compare
        const newProps = shapeToElement(shape);

        if (1 / newProps.angle === -Infinity) {
          newProps.angle = 0;
        } // recompose.shallowEqual discerns between 0 and -0

        const result = shallowEqual(oldProps, newProps)
          ? null
          : { position: newProps, elementId: shape.id };
        return result;
      }
    })
    .filter(identity);
  if (repositionings.length) {
    setPositions(repositionings);
  }
};

// todo check past usage and eliminate
const getRootElementId = (lookup, id) => {
  if (!lookup.has(id)) {
    return null;
  }

  const element = lookup.get(id);
  return element.parent && element.parent.subtype !== 'adHocGroup'
    ? getRootElementId(lookup, element.parent)
    : element.id;
};

export const componentLayoutLocalState = props => {
  // console.log('setting aero state on component!!!');
  const shapes = props.elements
    .map(elementToShape)
    .filter((d, i, a) => !d.id.startsWith('group') || a.find(s => s.parent === d.id));
  // todo delete these
  idDuplicateCheck(shapes);
  missingParentCheck(shapes);
  shapes.forEach(shape => {
    shape.localTransformMatrix = shape.parent
      ? multiply(
          invert(shapes.find(s => s.id === shape.parent).transformMatrix),
          shape.transformMatrix
        )
      : shape.transformMatrix;
  });
  // todo move this initial state in a file under `aeroelastic/`
  return {
    primaryUpdate: null,
    currentScene: { shapes, configuration: aeroelasticConfiguration },
  };
};
