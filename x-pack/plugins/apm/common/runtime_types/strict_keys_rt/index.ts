/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { either, isRight } from 'fp-ts/lib/Either';
import { mapValues, difference, isPlainObject, forEach } from 'lodash';
import { MergeType, merge } from '../merge';

/*
  Type that tracks validated keys, and fails when the input value
  has keys that have not been validated.
*/

type ParsableType =
  | t.IntersectionType<any>
  | t.UnionType<any>
  | t.PartialType<any>
  | t.ExactType<any>
  | t.InterfaceType<any>
  | MergeType<any>;

function getKeysInObject<T extends Record<string, unknown>>(
  object: T,
  prefix: string = ''
): string[] {
  const keys: string[] = [];
  forEach(object, (value, key) => {
    const ownPrefix = prefix ? `${prefix}.${key}` : key;
    keys.push(ownPrefix);
    if (isPlainObject(object[key])) {
      keys.push(
        ...getKeysInObject(object[key] as Record<string, unknown>, ownPrefix)
      );
    }
  });
  return keys;
}

function addToContextWhenValidated<
  T extends t.InterfaceType<any> | t.PartialType<any>
>(type: T, prefix: string): T {
  const validate = (input: unknown, context: t.Context) => {
    const result = type.validate(input, context);
    const keysType = context[0].type as StrictKeysType;
    if (!('trackedKeys' in keysType)) {
      throw new Error('Expected a top-level StrictKeysType');
    }
    if (isRight(result)) {
      keysType.trackedKeys.push(
        ...Object.keys(type.props).map((propKey) => `${prefix}${propKey}`)
      );
    }
    return result;
  };

  if (type._tag === 'InterfaceType') {
    return new t.InterfaceType(
      type.name,
      type.is,
      validate,
      type.encode,
      type.props
    ) as T;
  }

  return new t.PartialType(
    type.name,
    type.is,
    validate,
    type.encode,
    type.props
  ) as T;
}

function trackKeysOfValidatedTypes(
  type: ParsableType | t.Any,
  prefix: string = ''
): t.Any {
  if (!('_tag' in type)) {
    return type;
  }
  const taggedType = type as ParsableType;

  switch (taggedType._tag) {
    case 'IntersectionType': {
      const collectionType = type as t.IntersectionType<t.Any[]>;
      return t.intersection(
        collectionType.types.map((rt) =>
          trackKeysOfValidatedTypes(rt, prefix)
        ) as [t.Any, t.Any]
      );
    }

    case 'UnionType': {
      const collectionType = type as t.UnionType<t.Any[]>;
      return t.union(
        collectionType.types.map((rt) =>
          trackKeysOfValidatedTypes(rt, prefix)
        ) as [t.Any, t.Any]
      );
    }

    case 'MergeType': {
      const collectionType = type as MergeType<t.Any[]>;
      return merge(
        collectionType.types.map((rt) =>
          trackKeysOfValidatedTypes(rt, prefix)
        ) as [t.Any, t.Any]
      );
    }

    case 'PartialType': {
      const propsType = type as t.PartialType<any>;

      return addToContextWhenValidated(
        t.partial(
          mapValues(propsType.props, (val, key) =>
            trackKeysOfValidatedTypes(val, `${prefix}${key}.`)
          )
        ),
        prefix
      );
    }

    case 'InterfaceType': {
      const propsType = type as t.InterfaceType<any>;

      return addToContextWhenValidated(
        t.type(
          mapValues(propsType.props, (val, key) =>
            trackKeysOfValidatedTypes(val, `${prefix}${key}.`)
          )
        ),
        prefix
      );
    }

    case 'ExactType': {
      const exactType = type as t.ExactType<t.HasProps>;

      return t.exact(
        trackKeysOfValidatedTypes(exactType.type, prefix) as t.HasProps
      );
    }

    default:
      return type;
  }
}

class StrictKeysType<
  A = any,
  O = A,
  I = any,
  T extends t.Type<A, O, I> = t.Type<A, O, I>
> extends t.Type<A, O, I> {
  trackedKeys: string[];

  constructor(type: T) {
    const trackedType = trackKeysOfValidatedTypes(type);

    super(
      'strict_keys',
      trackedType.is,
      (input, context) => {
        this.trackedKeys.length = 0;
        return either.chain(trackedType.validate(input, context), (i) => {
          const originalKeys = getKeysInObject(
            input as Record<string, unknown>
          );
          const excessKeys = difference(originalKeys, this.trackedKeys);

          if (excessKeys.length) {
            return t.failure(
              i,
              context,
              `Excess keys are not allowed: \n${excessKeys.join('\n')}`
            );
          }

          return t.success(i);
        });
      },
      trackedType.encode
    );

    this.trackedKeys = [];
  }
}

export function strictKeysRt<T extends t.Any>(type: T): T {
  return (new StrictKeysType(type) as unknown) as T;
}
