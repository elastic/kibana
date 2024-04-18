# Kibana-Rust integration

This POC integrates Kibana and Rust using [napi-rs](https://napi.rs/)
either calling Rust code from a Kibana plugin as well as calling Kibana code
from Rust.

It's easier if you run it from a Nix environment since the project adds a flake
with a shell including everything needed to build the crate, otherwise,
[install Rust](https://www.rust-lang.org/tools/install).

## Build the NPM package

```bash
yarn build
```

## Examples

### Deal with a Promise returned by Rust

```javascript
import { fetchClusterData } from '../kbn-rs/telemetry';
const clusterData = await fetchClusterData(receiver);
```

### Query Elastic

```javascript
import { 
  JsElasticConfig, 
  JsElastic, 
  JsTelemetryModel, 
  JsTelemetryReceiver 
} from "../kbn-rs/telemetry";

const main = async (): Promise<void> => {
  console.log(">> Start");

  console.log(">> Creating elastic config");
  const config = new JsElasticConfig("http://localhost:9200", "elastic", "changeme");

  console.log(">> Creating Elastic service");
  const service = new JsElastic(config);

  console.log(">> Creating fake telemetry receiver");
  const receiver = new JsTelemetryReceiver(service);

  console.log(">> Creating index...");
  await service.createIndex("test_index");

  console.log(">> done! inserting data...");
  const event = new JsTelemetryModel("1", "abc", 123);
  let id = await service.index("test_index", event);

  console.log(`>> done! created document with id: ${id} finding data...`);
  const result = await service.search("test_index");

  console.log(`>> Result: got ${result.length} docs`);
  result.forEach((doc) => {
    console.log(`>> doc: ${doc.id} ${doc.name} ${doc.value}`);
  })

  console.log(">> Adding a few more telemetry events...")
  for (let i = 20; i < 30; i++) {
    const event = new JsTelemetryModel(`${i}`, `Event ${i}`, 123 + i);
    await service.index("test_index", event);
    console.log(`Done ${i}`);
  };
  console.log(">> Done!");

  console.log(">> Searching telemetry documents...");
  const events = await receiver.findTelemetryEvents("test_index");
  console.log(`>> Result: got ${events.length} docs`);
  events.forEach((doc) => {
    console.log(`>> doc: ${doc.id} ${doc.name} ${doc.value}`);
  })

  console.log(">> done! deleting index...");
  await service.deleteIndex("test_index");
}
```

### Random code

Show the interactions between Rust and JavaScript, the async stuff uses
[Tokio](https://tokio.rs/)

```javascript
class Receiver {
  constructor(private readonly times: number) {
  }

  async multiply(n: number): Promise<number> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(n * this.times), 1000)
    })
  }
}

const sandbox = async (): Promise<void> => {
  // do some work in the background
  const id = setInterval(() => {
    console.log("tick");
  }, 300);

  const hello = () => console.log("Hello, world");
  call0(hello);

  const plusOne = async (n: number): Promise<number> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(n + 1), 1000)
    })
  };

  console.log("calling async function");
  let promise = callAsync(plusOne, 99);
  console.log("Done, waiting for result");

  let result = await promise;

  console.log("Result: ", result);

  const receiver = new Receiver(101);
  console.log("calling async function on object");
  promise = callAsyncOnObject(receiver, "multiply", 3);
  console.log("Done, waiting for result");

  result = await promise;

  console.log("Result: ", result);

  clearInterval(id);
}
```