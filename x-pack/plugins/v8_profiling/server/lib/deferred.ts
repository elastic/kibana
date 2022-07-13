// inline version of https://www.npmjs.com/package/p-defer ; an object
// with .promise, .resolve(), and .reject() properties
export function createDeferred() {
  let resolver: any;
  let rejecter: any;

  function resolve(...args: any[]) {
    resolver(...args);
  }

  function reject(...args: any[]) {
    rejecter(...args);
  }

  const promise = new Promise((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });

  return { promise, resolve, reject };
}
