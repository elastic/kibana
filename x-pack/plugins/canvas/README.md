# Canvas

"Never look back. The past is done. The future is a blank canvas." ― Suzy Kassem, Rise Up and Salute the Sun

## Getting Started

Canvas is included with X-Pack and requires a Basic license or better to use.

## Developing in Canvas

To develop your own Canvas plugins, you simply create a Kibana plugin, and register your customizations with Canvas.

The following is a step-by-step guide to adding your own custom random number Canvas plugin.

### Generating a Kibana plugin

```bash
# in the kibana directory
# Rename canvas_example to whatever you want your plugin to be named
node scripts/generate_plugin.js canvas_example
```

This will prompt you for some input. Generally, you can answer as follows:

```
❯ node scripts/generate_plugin.js canvas_example
? Would you like to create the plugin in a different folder? No
? Provide a short description An awesome Kibana plugin
? What Kibana version are you targeting? master
? Should an app component be generated? No
? Should a server API be generated? No
? Should translation files be generated? No
? Would you like to use a custom eslint file? No
```

Once this has completed, go to your plugin directory:

```bash
cd plugins/canvas_example
```

Open that folder in your code editor of choice: `code .`

#### Creating a Canvas element and function
Open your plugin's `kibana.json` file. Make sure that `ui` has a value of true, and that `'canvas'` is included in `requiredPlugins`.  It should look something like this.  

```json
{
  "id": "canvasExample",
  "version": "7.8.0",
  "server": false,
  "ui": true,
  "requiredPlugins": ["canvas"],
  "optionalPlugins": []
}
```

In your plugin folder, create a new folder `public` and an `index.ts` file within it.

This `index.ts` will need export a Kibana Plugin. You can use this as a starting point for your plugin.

```typescript
import { Plugin, CoreSetup, CoreStart } from '../../../src/core/public';
import { CanvasSetup } from '../../../x-pack/plugins/canvas/public';

interface CanvasExampleSetupPlugins {
  canvas: CanvasSetup;
}

interface CanvasExampleStartPlugins {}

class CanvasExamplePlugin
  implements Plugin<void, void, CanvasExampleSetupPlugins, CanvasExampleStartPlugins> {
  setup(core: CoreSetup, plugins: CanvasExampleSetupPlugins) {}

  start(core: CoreStart) {}
}

export const plugin = () => new CanvasExamplePlugin();
```


Now that the Kibana plugin boilerplate is out of the way, you can start adding functionality to Canvas.  

Let's start by adding a new function.

In your `index.ts` add a new function definition:

```typescript
const canvasFunctions = [
  () => ({
    name: 'random',
    help: 'Make a random number between 1 and 100',
    args: {},
    fn() {
      return Math.floor(Math.random() * 100) + 1;
    }
  }),
];
```

Then, in the `setup` method of your plugin, you can add this new function definition to Canvas:

```typescript
setup(core: CoreSetup, plugins: CanvasExampleSetupPlugins) {
  plugins.canvas.addFunctions(canvasFunctions);
}
```

Now, let's add a new Element type.  In your `index.ts` add a new element definition:

```typescript
const elements = [
  () => ({
    name: 'randomNumber',
    displayName: 'Random Number',
    help: 'A random number between 1 and 100',
    image: 'https://images.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltb59c89a07c05b937/5c583a6602ac90e80ba0ab8f/icon-white-circle-elastic-stack.svg',
    expression: 'random | metric "Random Number"',
  }),
];
```

And then, in the `setup` method of the plugin, add this new element definition to Canvas, just like you did with the function:

```typescript
setup(core: CoreSetup, plugins: CanvasExampleSetupPlugins) {
  plugins.canvas.addFunctions(canvasFunctions);
  plugins.canvas.addElements(elements);
}
```

Now, your 'Random Number' element will show up in the list of other Canvas elements.

#### Trying out your new plugin

In the terminal, in your plugin's directory, run:

```bash
# In plugins/canvas_example
yarn start
```

- Pull up Kibana in your browser: `http://localhost:5601`
- Go to canvas, and click: "Create workpad"
- Click: "Add element"
- Click: "Other"
- Click: "Random Number"

#### Adding a server-side function

> Server side functions may be deprecated in a later version of Kibana as they require using an API marked _legacy_

Now, let's add a function which runs on the server.

In your plugin's `kibana.json` file, set `server` to true, and add `"expressions"` as a requiredPlugin. 

```typescript
{
  "id": "canvasExample",
  "version": "8.0.0",
  "server": false,
  "ui": true,
  "requiredPlugins": ["canvas", "expressions"],
  "optionalPlugins": []
}
```

Now, much like we made the client plugin, we'll make a server plugin.  

Start by making the `server` directory and an `index.ts` file with a shell for your server plugin:

```typescript
import { Plugin, CoreSetup, CoreStart } from '../../../src/core/server';
import { ExpressionsServerSetup } from '../../../src/plugins/expressions/server';

interface CanvasExamplePluginsSetup {
  expressions: ExpressionsServerSetup;
}

class CanvasExamplePlugin implements Plugin {
  setup(core: CoreSetup, plugins: CanvasExamplePluginsSetup) {}

  start(core: CoreStart) {}
}

export const plugin = () => new CanvasExamplePlugin();
```

Now, we'll create a simple function definition that we will register on the server:

```typescript
const serverFunctions = [
  () => ({
    name: 'serverTime',
    help: 'Get the server time in milliseconds',
    args: {},
    fn() {
      return Date.now();
    },
  }),
];
```

And then in our setup method, register it with the Expressions plugin:

```typescript
setup(core: CoreSetup, plugins: CanvasExamplePluginsSetup) {
  // .register requires serverFunctions and types, so pass an empty array
  // if you don't have any custom types to register
  plugins.expressions.__LEGACY.register({ serverFunctions, types: [] });
}
```

Now, let's try out our new server function.

- Refresh your browser.
- In the same Canvas workpad:
  - Add another Random Number element as before
  - Click that element to select it
  - Click "Expression editor"
  - Modify the expression to look like this: `serverTime | metric "Server Time in ms"`
  - Click "Run"

You should now see one random number and one "Server Time in ms" value.

> More information about building Kibana Plugins can be found in [src/core](https://github.com/elastic/kibana/blob/master/src/core/README.md)

#### My Canvas Plugin stopped working

If your Kibana Server is crashing on startup with a message like

> **FATAL** Error: Unmet requirement "canvas" for plugin "your_plugin_name"

or

> **FATAL** Error: Unmet requirement "interpreter" for plugin "your_plugin_name"

then your plugin was likely created to work on a previous version of Kibana. Starting with version 7.8, the plugin system was redesigned and caused breaking changes to these earlier plugins.  

The good news is that all of your existing Canvas extension code can be reused, it just needs to be in an updated Kibana plugin.  Follow the [instructions](#generating-a-kibana-plugin) for creating a new Canvas Kibana plugin, and then add in your existing functions and elements.  

## Scripts

There are several scripts available once you are in that path as well.

- `node scripts/lint` - local linter setup, can also be used with the `--fix` flag for automatic fixes.
- `node scripts/test` - local test runner, does not require a real Kibana instance. Runs all the same unit tests the normal runner does, just limited to Canvas, and *waaaaaay* faster (currently 12 seconds or less).
- `node scripts/test_dev` - Same as above, but watches for changes and only runs tests for the given scope (browser, server, or common).

## Feature Questions

**Why are there no tooltips**

We've opted for always available data labels instead, for now. While there exists much functionality that can be used for analytical purposes in Canvas our core concern in presentational. In a hands-off presentation format, such as a report or a slideshow, there is no facility for user to mouseover a chart to see a tooltip; data labels are a better fit for us.

## Background

**What is Canvas?**

Canvas is a new visualization application on top of Elasticsearch data. Canvas is extremely versatile, but particularly differentiating example use cases include live infographics, presentations with live-updating charts, and highly customized reports.

**Why did we build it? How does this align with the larger Kibana vision?**

We realized early on that we are not trying to build one UI “to rule them all” in Kibana. Elasticsearch caters to a wide variety of use cases, users, and audiences and Kibana provides different experiences for these users to explore and interact with their data. Canvas is one of such applications, in particular catering to users looking for desktop-publishing level of control for the presentation of their data summaries.

**Does Canvas replace any part of Kibana?**

No, it is an alternative experience that does not conflict with other parts of Kibana.

**Isn’t there overlap between Canvas and Dashboard?**

While both can be used as a way to build up reports, Canvas and Dashboard have different goals. Canvas focuses on highly customizable layout more suited to highly curated presentations, while Dashboard provides a fast and efficient way to build up and manage business analytics and operational dashboards that don’t require a high degree of layout control and customizability.

**Where can I see a demo of Canvas?**

Elasticon 2017 keynote (starts at 01:27:00): https://www.elastic.co/elasticon/conf/2017/sf/opening-keynote

Shane Connelly's SQL webinar: https://www.elastic.co/webinars/introduction-to-elasticsearch-sql
