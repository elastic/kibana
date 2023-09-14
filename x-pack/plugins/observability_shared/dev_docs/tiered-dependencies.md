# Tiered Dependencies in Observability

Our goal in observability is to provide as seamless of an experience as possible for our observability users, especially when it comes to navigating between areas owned by different teams. In Kibana, these different teams each own their own experiences inside of a Kibana plugin that provides a public UI interface and, optionally, a back-end server interface. As these plugins begin to share more components, utilities, data clients, and more, the Kibana architecture requires them to depend on each other using runtime dependencies. These dependencies can only be single-direction, which severely limits the types of sharing our plugins can do with one another. 

For years, APM has declared one of these single-direction runtime dependencies on the Infra plugin, allowing APM to use components and utilities made available by Infra. Because of this existing dependency, Infra can never make use of similar shared items that could be made available from APM. As Logs+ grows and evolves and Synthetics and Profiling have both become GA, we expect this problem to multiply quickly.

To solve this problem, we will use a convention called "tiered dependencies".

## Tier system

The dependency tiers look like this:

<img width="661" alt="Screenshot 2023-09-14 at 3 27 56 PM" src="https://github.com/elastic/kibana/assets/159370/6d6ff7ab-0f2d-416b-9400-9760f62f84bc">

Within this system, a plugin in any tier may ONLY introduce dependencies on other plugins that are in a tier below theirs. They may NOT depend on plugins in the same tier or in tiers above their own. 

**Note:** Tiers are NOT currently enforced by any lint rule or other rule. Tiers are a convention that allow us to structure our code in such a way as to avoid the circular dependency problem, but they require manual enforcement via code review. In the near future, we should explore simple ways to codify and enforce this system, either in linting rules, Kibana bundling enforcement, precommit hooks, etc.

### Tier 1: End user tier

End user plugins are the plugins that provide visible sections of the Observability UI in Kibana. Each of these plugins may provide one or more navigational areas inside of the Observability product, and they each may provide one or more Kibana server APIs as well. 

These plugins should stop introducing dependencies on each other immediately, and should also stop introducing new functionality that relies on existing dependencies immediately, as well. As soon as possible, existing dependencies between these plugins should be removed and replaced with extracted functionality.

<img width="722" alt="Screenshot 2023-09-14 at 3 32 17 PM" src="https://github.com/elastic/kibana/assets/159370/ef5af3f7-58b1-4618-a972-50439fb53485">

### Tier 2: Share tier

"Share plugins" provide shared functionality (UI components, utility functions, shared logic, etc.) that can be used by multiple end user plugins. Being plugins, they still take advantage of the Kibana runtime lifecycle (setup, start, stop) and have access to Kibana's core functionality and core plugin system.

This tier is where we would move any shared items, business logic, and stateful dependencies that need access to the plugin lifecycle and, for whatever reason, can't or don't want to accept runtime dependencies as injected parameters.

<img width="589" alt="Screenshot 2023-09-14 at 3 32 25 PM" src="https://github.com/elastic/kibana/assets/159370/f2dd422f-cf85-4fc3-b072-c68316db007d">

### Tier 3: Data access tier

This is the newest tier being introduced, and involves new "data access client" plugins which encapsulate the logic for accessing our various types of signal data in observability. By keeping this tier isolated from the other code and only allowing for it to depend on Kibana core, we make data access safely available to any other plugin in the end user or share tiers.

<img width="717" alt="Screenshot 2023-09-14 at 3 32 30 PM" src="https://github.com/elastic/kibana/assets/159370/36175bf2-de9e-477b-81d5-d004d599471f">

### Core: Kibana core

Anything made available by Kibana core, either in the CoreSetup, CoreStart, or one of the core-maintained plugins such as saved objects, etc. is fair game as a dependency of any observability plugin in any tier.

### Packages

Kibana packages are stateless and therefore can be imported into any plugin in any tier. If your shareable item is stateless, or if it can be simply built to accept strongly-typed items using dependency injection, using a package is almost always the best choice.

## Putting it all together

<img width="1061" alt="Screenshot 2023-09-14 at 3 37 35 PM" src="https://github.com/elastic/kibana/assets/159370/106de340-3ec4-4cff-88db-af51857d865d">

With the exception of package dependencies, all plugin-to-plugin dependencies may only flow _downward_ in the tier diagram.

<img width="1071" alt="Screenshot 2023-09-14 at 3 37 42 PM" src="https://github.com/elastic/kibana/assets/159370/2746d3b1-aacc-4b86-b61f-40f72236403b">

