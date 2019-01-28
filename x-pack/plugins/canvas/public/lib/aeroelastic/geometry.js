/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const matrix = require('./matrix');

/**
 * Pure calculations with geometry awareness - a set of rectangles with known size (a, b) and projection (transform matrix)
 */

/**
 *
 * a * x0 + b * x1 = x
 * a * y0 + b * y1 = y
 *
 * a, b = ?
 *
 * b = (y - a * y0) / y1
 *
 * a * x0 + b * x1 = x
 *
 * a * x0 + (y - a * y0) / y1 * x1 = x
 *
 * a * x0 + y / y1 * x1 - a * y0 / y1 * x1 = x
 *
 * a * x0 - a * y0 / y1 * x1 = x - y / y1 * x1
 *
 * a * (x0 - y0 / y1 * x1) = x - y / y1 * x1
 *
 * a = (x - y / y1 * x1) / (x0 - y0 / y1 * x1)
 * b = (y - a * y0) / y1
 *
 */
// set of shapes under a specific point
const shapesAtPoint = (shapes, x, y) =>
  shapes.map((shape, index) => {
    const { transformMatrix, a, b } = shape;

    // Determine z (depth) by composing the x, y vector out of local unit x and unit y vectors; by knowing the
    // scalar multipliers for the unit x and unit y vectors, we can determine z from their respective 'slope' (gradient)
    const centerPoint = matrix.normalize(matrix.mvMultiply(transformMatrix, matrix.ORIGIN));
    const rightPoint = matrix.normalize(matrix.mvMultiply(transformMatrix, [1, 0, 0, 1]));
    const upPoint = matrix.normalize(matrix.mvMultiply(transformMatrix, [0, 1, 0, 1]));
    const x0 = rightPoint[0] - centerPoint[0];
    const y0 = rightPoint[1] - centerPoint[1];
    const x1 = upPoint[0] - centerPoint[0];
    const y1 = upPoint[1] - centerPoint[1];
    const A = (x - centerPoint[0] - ((y - centerPoint[1]) / y1) * x1) / (x0 - (y0 / y1) * x1);
    const B = (y - centerPoint[1] - A * y0) / y1;
    const rightSlope = rightPoint[2] - centerPoint[2];
    const upSlope = upPoint[2] - centerPoint[2];
    const z = centerPoint[2] + (y1 ? rightSlope * A + upSlope * B : 0); // handle degenerate case: y1 === 0 (infinite slope)

    // We go full tilt with the inverse transform approach because that's general enough to handle any non-pathological
    // composition of transforms. Eg. this is a description of the idea: https://math.stackexchange.com/a/1685315
    // Hmm maybe we should reuse the above right and up unit vectors to establish whether we're within the (a, b) 'radius'
    // rather than using matrix inversion. Bound to be cheaper.

    const inverseProjection = matrix.invert(transformMatrix);
    const intersection = matrix.normalize(matrix.mvMultiply(inverseProjection, [x, y, z, 1]));
    const [sx, sy] = intersection;

    // z is needed downstream, to tell which one is the closest shape hit by an x, y ray (shapes can be tilted in z)
    // it looks weird to even return items where inside === false, but it could be useful for hotspots outside the rectangle
    return { z, intersection, inside: Math.abs(sx) <= a && Math.abs(sy) <= b, shape, index };
  });

// Z-order the possibly several shapes under the same point.
// Since CSS X points to the right, Y to the bottom (not the top!) and Z toward the viewer, it's a left-handed coordinate
// system. Yet another wording is that X and Z point toward the expected directions (right, and towards the viewer,
// respectively), but Y is pointing toward the bottom (South). It's called left-handed because we can position the thumb (X),
// index (Y) and middle finger (Z) on the left hand such that they're all perpendicular to one another, and point to the
// positive direction.
//
// If it were a right handed coordinate system, AND Y still pointed down, then Z should increase away from the
// viewer. But that's not the case. So we maximize the Z value to tell what's on top.
const shapesAt = (shapes, { x, y }) =>
  shapesAtPoint(shapes, x, y)
    .filter(shape => shape.inside)
    .sort((shape1, shape2) => shape2.z - shape1.z || shape2.index - shape1.index) // stable sort: DOM insertion order!!!
    .map(shape => shape.shape); // decreasing order, ie. from front (closest to viewer) to back

const getExtremum = (transformMatrix, a, b) =>
  matrix.normalize(matrix.mvMultiply(transformMatrix, [a, b, 0, 1]));

const landmarkPoint = (a, b, transformMatrix, k, l) => getExtremum(transformMatrix, k * a, l * b);

module.exports = {
  landmarkPoint,
  shapesAt,
};
