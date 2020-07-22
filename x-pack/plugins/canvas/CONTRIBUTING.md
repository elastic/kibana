# Contributing to Canvas

Canvas is a plugin for Kibana, therefore its [contribution guidelines](../../../CONTRIBUTING.md) apply to Canvas development, as well.  This document contains Canvas-specific guidelines that extend from the Kibana guidelines.

- [Active Migrations](#active_migrations)
- [i18n](#i18n)
- [Component Code Structure](#component_code_structure)
- [Storybook](#storybook)

## Active Migrations

When editing code in Canvas, be aware of the following active migrations, (generally, taken when a file is touched):

- Convert file(s) to Typescript.
- Convert React classes to Functional components, (where applicable).
- Add Storybook stories for components, (and thus Storyshots).
- Remove `recompose` in favor of React hooks.
- Apply improved component structure.
- Write tests.

## i18n

i18n syntax in Kibana can be a bit verbose in code:

```js
  i18n('pluginNamespace.messageId', {
    defaultMessage: 'Default message string literal, {key}',
    values: {
      key: 'value',
    },
    description: 'Message context or description',
  });
```

To keep the code terse, Canvas uses i18n "dictionaries": abstracted, static singletons of accessor methods which return a given string:

```js

// i18n/components.ts
export const ComponentStrings = {
  // ...
  AssetManager: {
    getCopyAssetMessage: (id: string) =>
      i18n.translate('xpack.canvas.assetModal.copyAssetMessage', {
        defaultMessage: `Copied '{id}' to clipboard`,
        values: {
          id,
        },
      }),
      // ...
  },
  // ...
};

// asset_manager.tsx
import { ComponentStrings } from '../../../i18n';
const { AssetManager: strings } = ComponentStrings;

const text = (
  <EuiText>
    {strings.getSpaceUsedText(percentageUsed)}
  </EuiText>
);

```

These singletons can then be changed at will, as well as audited for unused methods, (and therefore unused i18n strings).

## Component Code Structure

Canvas uses Redux.  Component code is divided into React components and Redux containers.  This way, components can be reused, their containers can be edited, and both can be tested independently.

Canvas is actively migrating to a structure which uses the `index.ts` file as a thin exporting index, rather than functional code:

```
- components
  - foo                       <- directory representing the component
    - foo.ts                  <- redux container
    - foo.component.tsx       <- react component
    - foo.scss
    - index.ts                <- thin exporting index, (no redux)
  - bar                       <- directory representing the component
    - bar.ts
    - bar.component.tsx
    - bar.scss
    - bar_dep.ts              <- redux sub container
    - bar_dep.component.tsx   <- sub component
    - index.ts
```

The exporting file would be:

```
export { Foo } from './foo';
export { Foo as FooComponent } from './foo.component';
```

### Why?

Canvas has been using an "index-export" structure that has served it well, until recently.  In this structure, the `index.ts` file serves as the primary export of the Redux component, (and holds that code).  The component is then named-- `component.tsx`-- and consumed in the `index` file.

The problem we've run into is when you have sub-components which are also connected to Redux.  To maintain this structure, each sub-component and its Redux container would then be stored in a subdirectory, (with only two files in it).

> NOTE: if a PR touches component code that is in the older structure, it should be migrated to the structure above.

## Storybook

Canvas uses [Storybook](https://storybook.js.org) to test and develop components.  This has a number of benefits:

- Developing components without needing to start ES + Kibana.
- Testing components interactively without starting ES + Kibana.
- Automatic Storyshot integration with Jest

### Using Storybook

The Canvas Storybook instance can be started by running `node scripts/storybook` from the Canvas root directory.  It has a number of options:

```
node scripts/storybook

  Storybook runner for Canvas.

  Options:
    --clean            Forces a clean of the Storybook DLL and exits.
    --dll              Cleans and builds the Storybook dependency DLL and exits.
    --stats            Produces a Webpack stats file.
    --site             Produces a site deployment of this Storybook.
    --verbose, -v      Log verbosely
    --debug            Log debug messages (less than verbose)
    --quiet            Only log errors
    --silent           Don't log anything
    --help             Show this message
```

### What about `kbn-storybook`?

Canvas wants to move to the Kibana Storybook instance as soon as feasible.  There are few tweaks Canvas makes to Storybook, so we're actively working with the maintainers to make that migration successful.

In the meantime, people can test our progress by running `node scripts/storybook_new` from the Canvas root.
