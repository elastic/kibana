# Adapter Based Architecture

## Terms

In this arch, we use 3 main terms to describe the code:

- **Libs / Domain Libs** - Business logic & data formatting (though complex formatting might call utils)
- **Adapters** - code that directly calls 3rd party APIs and data sources, exposing clean easy to stub APIs
- **Composition Files** - composes adapters into libs based on where the code is running
- **Implementation layer** - The API such as rest endpoints or graphql schema on the server, and the state management / UI on the client

## Arch Visual Example

![Arch Visual Overview](/docs/assets/arch.png)

## Code Guidelines

### Libs & Domain Libs:

This term is used to describe the location of business logic. Each use-case in your app should maintain its own lib.

Now there are 2 types of libs. A "regular lib" would be something like a lib for interacting with Kibana APIs, with something like a parent app adapter. The other is a "domain lib", and would be something like a hosts, or logging lib that might have composed into it an Elasicsearch adapter.

For the cases on this application, we might have a Logs, Hosts, Containers, Services, ParentApp, and Settings libs, just as an example. Libs should only have 1 Lib per use-case.

Libs have, composed into them, adapters, as well as access to other libs. The inter-dependencies on other libs and adapters are explicitly expressed in the types of the lib's constructor arguments to provide static type checking and improve testability. In the following example AdapterInterface would define the required interface of an adapter composed into this lib. Likewise LibInterface would declare the inter-dependency this lib has on other libs:

```ts
new (adapter: AdapterInterface, otherLibs: { lib1: Lib1Interface; lib2: Lib2Interface }): LibInterface
```

Libs must not contain code that depends on APIs and behavior specific to the runtime environment. Any such code should be extracted into an adapter. Any code that does not meet this requirement should be inside an adapter.

### Adapters

Adapters are the location of any code to interact with any data sources, or 3rd party API / dependency. An example of code that belongs to an adapter would be anything that interacts with Kibana, or Elasticsearch. This would also include things like, for instance, the browser's local storage.

**The interface exposed by an adapter should be as domain-specific as possible to reduce the risk of leaking abstraction from the "adapted" technology. Therefore a method like `getHosts()` would be preferable to a `runQuery(filterArgs)` method.** This way the output can be well typed and easily stubbed out in an alternate adapter. This will result in vast improvements in testing reliability and code quality.

Even adapters though should have required dependencies injected into them for as much as is reasonable. Though this is something that is up to the specific adapter as to what is best on a case-by-case basis.

An app will in most cases have multiple types of each adapter. As an example, a Lib might have an Elasticsearch-backed adapter as well as an adapter backed by an in-memory store, both of which expose the same interface. This way you can compose a lib to use an in-memory adapter to functional or unit tests in order to have isolated tests that are cleaner / faster / more accurate.

Adapters can at times be composed into another adapter. This behavior though should be kept to a strict minimum.

**Acceptable:**

- An Elasticsearch adapter being passed into Hosts, K8, and logging adapters. The Elasticsearch adapter would then never be exposed directly to a lib.

**Unacceptable:**

- A K8 adapter being composed into a hosts adapter, but then k8 also being exposed to a lib.

The former is acceptable only to abstract shared code between adapters. It is clear that this is acceptable because only other adapters use this code.

The latter being a "code smell" that indicates there is ether too much logic in your adapter that should be in a lib, or the adapters API is insufficient and should be reconsidered.

### Composition files

These files will import all libs and their required adapters to instantiate them in the correct order while passing in the respective dependencies. For a contrived but realistic example, a dev_ui composition file that composes an Elasticsearch adapter into Logs, Hosts, and Services libs, and a dev-ui adapter into ParentApp, and a local-storage adapter into Settings. Then another composition file for Kibana might compose other compatible adapters for use with the Kibana APIs.

composition files simply export a compose method that returns the composed and initialized libs.

## File structure

An example structure might be...

```
|-- infra-ui
    |-- common
    |   |-- types.ts
    |
    |-- server
    |   |-- lib
    |   |   |-- adapters
    |   |   |   |-- hosts
    |   |   |   |   |-- elasticsearch.ts
    |   |   |   |   |-- fake_data.ts
    |   |   |   |
    |   |   |   |-- logs
    |   |   |   |   |-- elasticsearch.ts
    |   |   |   |   |-- fake_data.ts
    |   |   |   |
    |   |   |   |-- parent_app
    |   |   |   |   |-- kibana_angular // if an adapter has more than one file...
    |   |   |   |   |   |-- index.html
    |   |   |   |   |   |-- index.ts
    |   |   |   |   |  
    |   |   |   |   |-- ui_harness.ts
    |   |   |   |
    |   |   |-- domains
    |   |   |   |-- hosts.ts
    |   |   |   |-- logs.ts
    |   |   |
    |   |   |-- compose
    |   |   |   |-- dev.ts
    |   |   |   |-- kibana.ts
    |   |   |
    |   |   |-- parent_app.ts // a non-domain lib
    |   |   |-- lib.ts // a file containing lib type defs
    |-- public
    |   | ## SAME STRUCTURE AS SERVER
```

Note that in the above adapters have a folder for each adapter type, then inside the implementation of the adapters. The implementation can be a single file, or a directory where index.js is the class that exposes the adapter.
`libs/compose/` contains the composition files
