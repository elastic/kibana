// helper to correctly set the prototype of custom error constructor
function setErrorPrototype(CustomError) {
  CustomError.prototype = Object.create(Error.prototype, {
    constructor: {
      value: Error,
      enumerable: false,
      writable: true,
      configurable: true,
    },
  });

  Object.setPrototypeOf(CustomError, Error);
}

// helper to create a custom error by name
function createError(name) {
  function CustomError(...args) {
    const instance = new Error(...args);
    instance.name = this.name = name;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(instance, CustomError);
    } else {
      Object.defineProperty(this, 'stack', {
        get() {
          return instance.stack;
        },
      });
    }
    return instance;
  }

  setErrorPrototype(CustomError);

  return CustomError;
}

export const RenderError = createError('RenderError');
