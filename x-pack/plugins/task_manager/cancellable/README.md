# Cancellable

A lightweight wrapper around native promises that adds cancellation support.

## Usage

Cancellable works like an ordinary promise, except it exposes a `cancel` method which cancels all further processing of the promise chain, and it exposes a `cancelled` method which will be invoked if the promise is being cancelled.

A simple example:

```js
import { Cancellable } from './cancellable';

function example() {
  return new Cancellable()
    .then(() => aLongRunningPromise(1000, { hello: 'world' }))
    .then((context) => aLongRunningPromise(2000, { ...context, hola: 'mundo!' }))
    .then((context) => aLongRunningPromise(1500, { state: context }))
    .cancelled(() => console.log('I was cancelled!'));
}

// Just used for demo purposes, simulates a long-running task
async function aLongRunningPromise(ms, result) {
  console.log(`Waiting ${ms}ms`);
  await new Promise(r => setTimeout(r, ms));
  return result;
}

// This should log 'I was cancelled!' to the terminal
await example().cancel();
```

Multiple cancelled calls are allowed, and each will be called if the promise is cancelled.

Cancelleable can also be called with many 

If `cancel` is called on the promise, the remaining function calls will not be made, and the original promise returned by `cancellable` will be rejected with an error that looks like this:

```js
{
  status: 'cancelled',
  message: 'Promise cancelled.'
}
```

Cancellables can be nested, and all nested cancellables will be cancelled if the parent is cancelled.

```js
import { Cancellable } from './cancellable';

const parent = new Cancellable()
  .cancelled(() => console.log('Parent cancelled'))
  .then(() => new Cancellable()
    .then(doChildStuff)
    .cancelled(() => console.log('Child cancelled')));

// Cancel the parent promise. If the parent's then has been called by the time
// parent.cancel is called, the console will show two log entries:
// 'Parent cancelled' and 'Child cancelled'.
await parent.cancel();
```
