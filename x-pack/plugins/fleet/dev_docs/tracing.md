# Using APM for server traces
Kibana ships with the [Elastic APM Node.js Agent](https://github.com/elastic/apm-agent-nodejs) built-in for debugging purposes.  We don't currently merge this to release builds, but it can be very helpful to diagnose or confirm the flow & timing of a request traveling through multiple services. 

To use it in Fleet, 
  1. Import the shared apm instance as needed (HTTP handler, service layer, etc)
    `import { apm } from '../path/to/ingest_manager/server'`
  1. add <code>apm.startTransaction</code> and/or <code>apm.startSpan</code></summary>
      - TODO: More details around rules / conventions for tracing
      - One example from `reporting` plugin: 
      https://github.com/elastic/kibana/blob/a537f9af500bc3d3a6e2ceea8817ee89c474cbb0/x-pack/plugins/reporting/server/export_types/png/execute_job/index.ts#L30-L31
      - <details><summary>an example for <code>startTransaction</code></summary> <a href="https://www.elastic.co/guide/en/apm/agent/nodejs/current/transaction-api.html"><code>Transaction</code> docs</a><p><img width="700" alt="Screen Shot 2020-11-02 at 9 06 50 AM" src="https://user-images.githubusercontent.com/57655/97877262-e7b11800-1cea-11eb-9883-aeb4fb6b4554.png"></details>
      - <details><summary>an example for <code>startSpan</code></summary><a href="https://www.elastic.co/guide/en/apm/agent/nodejs/current/span-api.html"><code>Span</code> docs</a><p><img width="1008" alt="Screen Shot 2020-06-02 at 9 15 42 PM" src="https://user-images.githubusercontent.com/57655/83584866-590b5580-a516-11ea-8133-286353000d5c.png"></details>
  1. start Kibana with APM enabled (as described in [Instrumenting with Elastic APM](https://github.com/elastic/kibana/blob/main/docs/developer/getting-started/debugging.asciidoc#instrumenting-with-elastic-apm))
      - <details><summary>via env variable or <code>config/apm.dev.js</code></summary>
        <code>ELASTIC_APM_ACTIVE=true yarn start</code>
        <p>or <code>module.exports = {
          active: true,
        };</code>
        </details>
      - By default traces are sent to a remote server, but you can send to a local APM by setting the <code>serverUrl</code> value in  <code>config/apm.dev.js</code>
      - TODO: document default server & credentials
  1. Run the code where you added the annotations e.g. make an HTTP request
  1. Go to `/app/apm#/traces` and see your trace
    search filter by host, transaction result, etc
      <details><summary>example screenshot</summary><img width="2011" alt="Screen Shot 2020-05-19 at 9 06 15 PM" src="https://user-images.githubusercontent.com/57655/97878933-4a0b1800-1ced-11eb-982b-73aa13a2926b.png"></details>
