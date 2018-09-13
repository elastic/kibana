import { get, identity } from 'lodash';
import { getType } from '../lib/get_type';

export function serializeProvider(types) {
  return {
    serialize: provider('serialize'),
    deserialize: provider('deserialize'),
  };

  function provider(key) {
    return context => {
      const type = getType(context);
      const typeDef = types[type];
      const fn = get(typeDef, key) || identity;
      return fn(context);
    };
  }
}
