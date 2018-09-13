/*
  boolArray is the array of bool filter clauses to push filters into. Usually this would be
  the value of must, should or must_not.
  filter is the abstracted canvas filter.
*/

/*eslint import/namespace: ['error', { allowComputed: true }]*/
import * as filters from './filters';

export function getESFilter(filter) {
  if (!filters[filter.type]) throw new Error(`Unknown filter type: ${filter.type}`);

  try {
    return filters[filter.type](filter);
  } catch (e) {
    throw new Error(`Could not create elasticsearch filter from ${filter.type}`);
  }
}
