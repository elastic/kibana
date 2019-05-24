# Observability Shared Resources

This "faux" plugin serves as a place to statically share resources, helpers, and components across observability plugins. There is some discussion still happening about the best way to do this, but this is one suggested method that will work for now and has the benefit of adopting our pre-defined build and compile tooling out of the box.

Files found here can be imported from any other x-pack plugin, with the caveat that these shared components should all be exposed at the `public/index` and `server/index` (or `common/index` for code shared between client and server), so that the platform can attempt to monitor breaking changes in the shared API.

# for a file found at `x-pack/plugins/infra/public/components/Example.tsx`

```ts
import { ExampleSharedComponent } from '../../../observability/public';
```

### Plugin registration and config

There is no plugin registration code or config in this folder because it's a "faux" plugin only being used to share code between other plugins.

### Directory structure

Code meant to be shared by the UI should live in `public/` and be explicity exported from `public/index` while server helpers etc should live in `server/` and be explicitly exported from `server/index`. Code that needs to be shared across client and server should live in `common/` and be exported from `common/index`.
