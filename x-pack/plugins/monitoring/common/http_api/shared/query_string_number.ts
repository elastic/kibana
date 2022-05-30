import * as rt from 'io-ts';

export const numberFromStringRT = new rt.Type<number, string, unknown>(
  'NumberFromString',
  rt.number.is,
  (value, context) => {
    const nb = parseInt(value);
    return isNaN(nb) ? rt.failure(value, context) : rt.success(nb);
  },
  String
);
