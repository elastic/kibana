import { expandDottedObject } from './expand_dotted_object';

const testFlattenedObj = {
  'flattened.property.a': 'valueA',
  'flattened.property.b': 'valueB',
  'regularProp': {
    'nestedProp': 'nestedValue'
  },
  'nested.array': [
    {
      'arrayProp': 'arrayValue'
    }
  ],
  'emptyArray': []
}
describe('expandDottedObject(obj)', () => {
  it('works', () => {
    const expanded:any = expandDottedObject(testFlattenedObj);

    expect(expanded.flattened.property.a).toEqual('valueA');
    expect(expanded.flattened.property.b).toEqual('valueB');
    expect(expanded.regularProp.nestedProp).toEqual('nestedValue');
    expect(Array.isArray(expanded.nested.array)).toBeTruthy();
    expect(expanded.nested.array[0].arrayProp).toEqual('arrayValue');
  });
});
