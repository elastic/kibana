# Canvas Shareable Workpads

- [Introduction](#introduction)
- [Quick Start](#quick-start)
- [Using the Runtime](#using-the-runtime)
  - [Assumptions](#assumptions)
  - [Restrictions](#restrictions)
  - [JS](#js)
  - [HTML](#html)
  - [Options](#options)
- [Testing](#testing)
  - [Download a ZIP from Canvas](#download-a-zip-from-canvas)
  - [Test the Runtime Directly from Webpack](#test-the-runtime-directly-from-webpack)
  - [Run the Canvas Storybook](#run-the-canvas-storybook)
  - [Run the Jest Tests](#run-the-jest-tests)
    - [Gathering Test Coverage](#gathering-test-coverage)
- [Building](#building)
  - [Build Options](#build-options)
- [Development](#development)
  - [Prerequisite](#prerequisite)
  - [Webpack Dev Server](#webpack-dev-server)
  - [Gathering Statistics](#gathering-statistics)
- [Architecture](#architecture)
  - [The Build](#the-build)
    - [Supported Expressions](#supported-expressions)
    - [Expression Interpreter](#expression-interpreter)
    - [Build Size](#build-size)
  - [The App](#the-app)
    - [App State](#app-state)
    - [CSS](#css)

## Introduction

The Canvas Shareable Runtime is designed to render Shareable Canvas Workpads outside of Kibana in a different website or application. It uses the intermediate, "transient" state of a workpad, which is a JSON-blob state after element expressions are initially evaluated against their data sources, but before the elements are rendered to the screen. This "transient" state, therefore, has no dependency or access to ES/Kibana data, making it lightweight and portable.

This directory contains the code necessary to build and test this runtime.

## Quick Start

- Load a workpad in Canvas.
- Click "Export" -> "Share on a website" -> "download a ZIP file"
- Extract and change to the extracted directory.
- On your local machine:
  - Start a web server, like: `python -m SimpleHTTPServer 9001`
  - Open a web browser to `http://localhost:9001`
- On a remote webserver:
  - Add `kbn_canvas.js` and your Shared Workpad file to your web page:
    ```
    <script src="kbn_canvas.js"></script>
    ```
  - Add the HTML snippet to your webpage:
    ```
    <div kbn-canvas-shareable="canvas" kbn-canvas-url="[WORKPAD URL]" />
    ```
  - Execute the JS method:
    ```
      <script type="text/javascript">
        KbnCanvas.share();
      </script>
    ```

## Using the Runtime

### Assumptions

- The runtime is added to a web page using a standard `<script>` tag.
- A Shared Workpad JSON file (see: [Testing](#Testing)) is available via some known URL.

### Restrictions

Not all elements from a workpad may render in the runtime. See [Supported Expressions](#supported-expressions) for more details.

### JS

The runtime is a global library with `KbnCanvas` as the namespace. When executed, the `share` method will interpret any and all nodes that match the API. This function can be called from anywhere, in a script block at the bottom of the page, or after any other initialization.

```html
<script type="text/javascript">
  KbnCanvas.share();
</script>
```

### HTML

The Canvas Shareable Runtime will scan the DOM of a given web page looking for any element with `kbn-canvas-shareable="canvas"` as an attribute. This DOM node will be the host in which the workpad will be rendered. The node will also be sized and manipulated as necessary, but all other attributes, (such as `id`) will remain unaltered. A class name, `kbnCanvas`, will be _added_ to the DOM node.

> Note: Any content within this DOM node will be replaced.

Options to configure the runtime are included on the DOM node. The only required attribute is `kbn-canvas-url`, the URL from which the shared workpad can be loaded.

> Note: the workpad is loaded by `fetch`, therefore the runtime cannot be initialized on the local file system. Relative URLs are allowed.

Each attribute on the node that is correctly parsed will be removed. For example:

```html
<!-- Markup added to the source file. -->
<div kbn-canvas-shareable="canvas" kbn-canvas-height="400" kbn-canvas-url="workpad.json" />

<!-- Markup in the DOM after runtime processes it. -->
<div class="kbnCanvas" />
```

A sure sign that there was an error, or that an attribute was included that is not recognized, would be any attributes remaining:

```html
<!-- Markup added to the source file. -->
<div kbn-canvas-shareable="canvas" kbn-canvas-hieght="400" kbn-canvas-url="workpad.json" />

<!-- Markup in the DOM after runtime processes it. -->
<div class="kbnCanvas" kbn-canvas-hieght="400" />
```

### Options

The [`api/shareable.tsx`]('./api/shareable') component file contains the base class with available options to configure the Shareable Workpad. Each of these would be prefixed with `kbn-canvas-`:

```typescript
  /**
   * The preferred height to scale the Shareable Canvas Workpad.  If only `height` is
   * specified, `width` will be calculated by the workpad ratio.  If both are
   * specified, the ratio will be overriden by an absolute size.
   */
  height?: number;

  /**
   * The preferred width to scale the Shareable Canvas Workpad.  If only `width` is
   * specified, `height` will be calculated by the workpad ratio.  If both are
   * specified, the ratio will be overriden by an absolute size.
   */
  width?: number;

  /**
   * The initial page to display.
   */
  page?: number;

  /**
   * Should the runtime automatically move through the pages of the workpad?
   * @default false
   */
  autoplay?: boolean;

  /**
   * The interval upon which the pages will advance in time format, (e.g. 2s, 1m)
   * @default '5s'
   * */
  interval?: string;

  /**
   * Should the toolbar be hidden?
   * @default false
   */
  toolbar?: boolean;
```

## Testing

You can test this functionality in a number of ways. The easiest would be:

### Download a ZIP from Canvas

- Load a workpad in Canvas.
- Click "Export" -> "Share on a website" -> "download a ZIP file"
- Extract and change to the extracted directory.
- Start a web server, like: `python -m SimpleHTTPServer 9001`
- Open a web browser to `http://localhost:9001`

### Test the Runtime Directly from Webpack

- Load a workpad in Canvas.
- Click "Export" -> "Share on a website" -> "Download Workpad"
- Copy the workpad to `canvas/shareable_runtime/test`.
- Edit `canvas/shareable_runtime/index.html` to include your workpad.
- From `/canvas`, run `node scripts/shareable_runtime --run`
- Open a web browser to `http://localhost:8080`

### Run the Canvas Storybook

From `/canvas`: `node scripts/storybook`

### Run the Jest Tests

The Jest tests utilize Enzyme to test interactions within the runtime, as well.

From `/canvas`: `node scripts/jest --path shareable_runtime`

#### Gathering Test Coverage

From `/canvas`: `node scripts/jest --path shareable_runtime --coverage`

## Building

Run `node scripts/shareable_runtime`. The runtime will be built and stored `shareable_runtime/build`.

### Build Options

By default, `scripts/shareable_runtime` will build a production-ready JS library. This takes a bit longer and produces a single file.

There are a number of options for the build script:

- `--dev` - allow Webpack to chunk the runtime into several files. This is helpful when developing the runtime itself.
- `--run` - run the Webpack Dev Server to develop and test the runtime. It will use HMR to incorporate changes.
- `--clean` - clean the runtime from the build directory.
- `--stats` - output Webpack statistics for the runtime.

## Development

### Prerequisite

Before testing or running this PR locally, you **must** run `node scripts/shareable_runtime` from `/canvas` _after_ `yarn kbn bootstrap` and _before_ starting Kibana. It is only built automatically when Kibana is built to avoid slowing down other development activities.

### Webpack Dev Server

To start the `webpack-dev-server` and test a workpad, simply run:

`/canvas`: `node scripts/shareable_runtime --dev --run`

A browser window should automatically open. If not, open a browser to [`http://localhost:8080/`](http://localhost:8080).

The `index.html` file contains a call to the `CanvasShareable` runtime. Currently, you can share by object or by url:

```html
<script src="kbn_canvas.js"></script>
...
<div kbn-canvas-shareable="canvas" kbn-canvas-height="400" kbn-canvas-url="workpad.json"></div>
<script type="text/javascript">
  KbnCanvas.share();
</script>
```

There are three workpads available, in `test/workpads`:

- `hello.json` - A simple 'Hello, Canvas' workpad.
- `austin.json` - A workpad from an Elastic{ON} talk in Austin, TX.
- `test.json` - A couple of pages with customized CSS animations and charts.

### Gathering Statistics

Webpack will output a `stats.json` file for analysis. This allows us to know how large the runtime is, where the largest dependencies are coming from, and how we might prune down its size. Two popular sites are:

- Official Webpack Analysis tool: http://webpack.github.io/analyse/
- Webpack Visualizer: https://chrisbateman.github.io/webpack-visualizer/

## Architecture

The Shareable Runtime is an independently-built artifact for use outside of Kibana. It consists of two parts: the Build and the App.

### The Build

A custom Webpack build is used to incorporate code from Canvas, Kibana and EUI into a single file for distribution. This code interprets the shared JSON workpad file and renders the pages of elements within the area provided.

#### Supported Expressions

Because Shareable Workpads are not connected to any data source in Kibana or otherwise, the runtime simply renders the transient state of the workpad at the time it was shared from within Canvas. So elements that are used to manipulate data, (e.g. filtering controls like `time_filter` or `dropdown_filter`) are not included in the runtime. This lowers the runtime size. Any element that uses an excluded renderer will render nothing in their place. Users are warned within Canvas as they download the Shared Workpad if their workpad contains any of these non-rendered controls.

> Note: Since the runtime is statically built with the Kibana release, renderers provided by plugins are not supported. Functions that use standard renderers, provided they are not data-manipulating, will still work as expected.

#### Expression Interpreter

Kibana and Canvas use an interpreter to register expressions and then eventually evaluate them at run time. Most of the code within the interpreter is not needed for the Shareable Runtime. As a result, a bespoke interpreter is used instead.

#### Build Size

At the moment, the resulting library is relatively large, (5.6M). This is due to the bundling of dependencies like EUI. By trading off file size, we're able to keep the library contained without a need to download other external dependencies, (like React). We're working to reduce that size through further tree-shaking or compression.

### The App

The App refers to the user interface that is embedded on the consuming web page and displays the workpad.

#### App State

To minimize the distribution size, we opted to avoid as many libraries as possible in the UI. So while Canvas uses Redux to maintain state, we opted for a React Context + Hooks-based approach with a custom reducer. This code can be found in `shareable_runtime/context`.

#### CSS

All CSS in the runtime UI uses CSS Modules to sandbox and obfuscate class names. In addition, the Webpack build uses `postcss-prefix-selector` to prefix all public class names from Kibana and EUI with `.kbnCanvas`. As a result, all class names should be sandboxed and not interfere with the host page in any way.
