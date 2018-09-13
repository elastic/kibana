import { mapValues } from 'lodash';

// It takes a function spec and passes in default args into the spec fn
export const functionWrapper = (fnSpec, mockReduxStore) => {
  const spec = fnSpec();
  const defaultArgs = mapValues(spec.args, argSpec => {
    return argSpec.default;
  });

  return (context, args, handlers) =>
    spec.fn(context, { ...defaultArgs, ...args }, handlers, mockReduxStore);
};
