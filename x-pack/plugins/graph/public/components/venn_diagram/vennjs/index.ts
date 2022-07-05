/*
 * This file is forked from the venn.js project (https://github.com/benfred/venn.js/),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `x-pack/plugins/graph/public/components/venn_diagram/vennjs/LICENSE` for more information.
 */

const SMALL$1 = 1e-10;

/** Circular segment area calculation. See http://mathworld.wolfram.com/CircularSegment.html */
function circleArea(r: number, width: number) {
  return r * r * Math.acos(1 - width / r) - (r - width) * Math.sqrt(width * (2 * r - width));
}

/** Returns the overlap area of two circles of radius r1 and r2 - that
have their centers separated by distance d. Simpler faster
circle intersection for only two circles */
function circleOverlap(r1: number, r2: number, d: number) {
  // no overlap
  if (d >= r1 + r2) {
    return 0;
  }

  // completely overlapped
  if (d <= Math.abs(r1 - r2)) {
    return Math.PI * Math.min(r1, r2) * Math.min(r1, r2);
  }

  const w1 = r1 - (d * d - r2 * r2 + r1 * r1) / (2 * d);
  const w2 = r2 - (d * d - r1 * r1 + r2 * r2) / (2 * d);
  return circleArea(r1, w1) + circleArea(r2, w2);
}

/** finds the zeros of a function, given two starting points (which must
 * have opposite signs */
function bisect(
  f: (param: number) => number,
  a: number,
  b: number,
  parameters = { maxIterations: null, tolerance: null }
) {
  parameters = parameters || {};
  const maxIterations = parameters.maxIterations || 100;
  const tolerance = parameters.tolerance || 1e-10;
  const fA = f(a);
  const fB = f(b);
  let delta = b - a;

  if (fA * fB > 0) {
    throw new Error('Initial bisect points must have opposite signs');
  }

  if (fA === 0) return a;
  if (fB === 0) return b;

  for (let i = 0; i < maxIterations; ++i) {
    delta /= 2;
    const mid = a + delta;
    const fMid = f(mid);

    if (fMid * fA >= 0) {
      a = mid;
    }

    if (Math.abs(delta) < tolerance || fMid === 0) {
      return mid;
    }
  }
  return a + delta;
}

/** Returns the distance necessary for two circles of radius r1 + r2 to
have the overlap area 'overlap' */
export function distanceFromIntersectArea(r1: number, r2: number, overlap: number) {
  // handle complete overlapped circles
  if (Math.min(r1, r2) * Math.min(r1, r2) * Math.PI <= overlap + SMALL$1) {
    return Math.abs(r1 - r2);
  }

  return bisect(
    function (distance$$1) {
      return circleOverlap(r1, r2, distance$$1) - overlap;
    },
    0,
    r1 + r2
  );
}
