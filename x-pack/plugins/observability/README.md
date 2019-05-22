# Observability Shared Resources

This "faux" plugin serves as a place to statically share resources, helpers, and components across observability plugins. There is some discussion still happening about the best way to do this, but this is one suggested method that will work for now and has the benefit of adopting our pre-defined build and compile tooling out of the box.

Files found here can be imported from any other x-pack plugin via:

// for a file found at `x-pack/plugins/infra/public/components/Example.tsx`

```ts
import { ExampleSharedComponent } from '../../../observability/public/components/example_shared_component';
```

### Plugin registration and config

There is no plugin registration code or config in this folder because it's more of a faux plugin only being used to share code amongst other plugins.

### Directory structure

Code meant to be shared by the UI should live in `public/` while server helpers etc should live in `server/`.
