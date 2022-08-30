Lens is a visualization editor allowing to quickly and easily configure compelling visualizations to use on dashboards and canvas workpads.

# Lens Embedding

It's possible to embed Lens visualizations in other apps using `EmbeddableComponent` and `navigateToPrefilledEditor`
exposed via contract. For more information check out the example in `x-pack/examples/embedded_lens_example`.

### Embedding guidance

When adding visualizations to a solution page, there are multiple ways to approach this with pros and cons:

* #### **Use a dashboard**
  If the app page you are planning to build strongly resembles a regular dashboard, it might not even be necessary to write code - configuring a dashboard might be a better choice. The Presentation team is currently working on making it possible to embed dashboard into the solution navigation, which allows you to offer visualization and filter functionality without writing custom code. If possible this option should be chosen because of the low maintenance and development effort as well as the high flexibility for a user to clone the preset dashboard and start customizing it in various ways.

  Pros:
   * No need to write and maintain custom code
   * "Open in Lens" comes for free
   * Ability for the user to customize/add/remove dashboard panels comes for free
  
  Cons:
   * Limited data processing/visualization options - if the dashboard doesn't support it, it can't be used
* #### **Use Lens embeddable**
  Using the Lens embeddable is an easy way to handle the rendering of charts. It allows you to specify data fetching and presentational properties of the final chart in a declarative way (the "Lens attributes") - everything is handled within the component (including re-fetching data on changing inputs). By using the `navigateToPrefilledEditor` method which takes the same configuration as the embeddable component, adding an "Open in Lens editor" button to your application comes at almost no additional cost. Such a button is always recommended as it allows a user to drill down further and explore the data on their own, using the current chart as a starting point. This approach is already widely deployed and should be the default choice for new visualizations.

  Pros:
   * No need to manage searches and rendering logic on your own
   * "Open in Lens" comes for free
  
  Cons:
   * Each panel does its own data fetching and rendering (can lead to performance problems for high number of embeddables on a single page, e.g. more than 20)
   * Limited data processing options - if the Lens UI doesn't support it, it can't be used
   * Limited visualization options - if Lens can't do it, it's not possible
* #### **Using custom data fetching and rendering**
  In case the disadvantages of using the Lens embeddable heavily affect your use case, it sometimes makes sense to roll your own data fetching and rendering by using the underlying APIs of search service and `elastic-charts` directly. This allows a high degree of flexibility when it comes to data processing, efficiently querying data for multiple charts in a single query and adjusting small details in how charts are rendered. However, do not choose these option lightly as maintenance as well as initial development effort will most likely be much higher than by using the Lens embeddable directly. In this case, almost always an "Open in Lens" button can still be offered to the user to drill down and further explore the data by generating a Lens configuration which is similar to the displayed visualization given the possibilities of Lens. Keep in mind that for the "Open in Lens" flow, the most important property isn't perfect fidelity of the chart but retaining the mental context of the user when switching so they don't have to start over. It's also possible to mix this approach with Lens embeddables on a single page.  **Note**: In this situation, please let the VisEditors team know what features you are missing / why you chose not to use Lens.

  Pros:
   * Full flexibility in data fetching optimization and chart rendering
  
  Cons:
   * "Open in Lens" requires additional logic
   * High maintenance and development effort

## Getting started

The `EmbeddableComponent` react component is exposed on the Lens plugin contract. In order to use it, 
* Make sure you have a data view created for the data you plan to work with
* Add `lens` to `requiredPlugins` in your plugins `kibana.json`
* In the mount callback of your app, get `lens.EmbeddableComponent` from the start contract and pass it into your apps react tree
* In the place where you want to render a visualization, add the component to the tree:
```tsx
<div>
  // my app
  <EmbeddableComponent
    id=""
    style={{ height: 500 }}
    timeRange={{ from: 'now - 15m', to: 'now' }}
    attributes={attributes}
  />
</div>
```

You can see a working example of this in the `x-pack/examples/embedded_lens_example` directory.

The `attributes` variable contains the configuration for the Lens visualization. The details are explained in the section below. It's difficult to set up this object manually, in order to quickly get to a functioning starting point, start your Kibana server with example plugins via
```
yarn start --run-examples
```

This will add an `Open in Playground` action to the menu bar in the Lens editor. With this option, try to configure the chart configuration directly in the editor, then open it in the playground to see the attributes object to copy. This works for any possible Lens visualization.

![Go to playground](./to_playground.gif "Go to playground")

## Lens attributes explained

The Lens attributes object contains multiple sections concerned with different aspects of the visualizations.

On a high level there are references, datasource state, visualization state and filters:

### References

References (`references`) are regular saved object references forming a graph of saved objects which depend on each other. For the Lens case, these references are always data views (called `type: "index-pattern"`) in code, referencing data views which are used in the current Lens visualization. Often there is just a single data view in use, but it's possible to use multiple data views for multiple layers in a Lens xy chart. The `id` of a reference needs to be the saved object id of the referenced data view (see the "Handling data views" section below). The `name` of the reference is comprised out of multiple parts used to map the data view to the correct layer : `indexpattern-datasource-layer-<id of the layer>`. Even if multiple layers are using the same data view, there has to be one reference per layer (all pointing to the same data view id).

### Datasource state

The data source state (`state.datasourceStates.indexPattern.layers`) contains the configuration state of the data fetching and processing part of Lens. It's not specific to a certain representation (xy, pie, gauge, ...), but instead it defines a data table per layer made out of columns with various properties. This data table is passed over to the visualization state which maps it to various dimensions of the specific visualization. Layer and columns have unique ids which are shared amongst visualization and datasource - it's important to make sure they are always in sync. The keys of the `state.datasourceStates.indexPattern.layers` object are the layer ids. Lens editor chooses uuids for these, but when programmatically generating Lens attributes, any string can be used for them. The `layers[<layer id>].columns` object is constructed in a similar way (keys represent the column ids). The `operationType` property defines the type of the column, other properties depend on the specific operation. Types for individual parts of the datasource state are provided (check the `lens/public` export, e.g. there's the `MaxIndexPatternColumn` for a column of operation type `max`)

### Visualization state

The visualization state (`state.visualization`) depends on the chosen visualization type (`visualizationType`). Layer ids and accessor properties in this state have to correspond to the layer ids and column ids of the datasource state. Types for individual visualizations are exported as standalone interfaces (e.g. `XYState` or `HeatmapVisualizationState`).

### Filters

Filters and query `state.filters`/`state.query` define the visualization-global filters and query applied to all layers of the visualization. The query is rendered in the top level search bar in the editor while filters are rendered as filter pills. Filters and query state defined this way is used for dashboards and Discover in the same way.

### Callbacks

The `EmbeddableComponent` also takes a set of callbacks to react to user interactions with the embedded Lens visualization to integrate the visualization with the surrounding app: `onLoad`, `onBrushEnd`, `onFilter`, `onTableRowClick`. A common pattern is to keep state in the solution app which is updated within these callbacks - re-rendering the surrounding application will change the Lens attributes passed to the component which will re-render the visualization (including re-fetching data if necessary).

## Handling data views

Currently it's necessary to have a data view saved object to use the Lens embeddable. Use the data view service to find an existing data view for a given index pattern or create a new one if it doesn't exist yet:
```ts
let dataView = (await dataViews.find('my-pattern-*', 1))[0];
if (!dataView) {
  dataView = await dataViews.createAndSave({
    title: 'my-pattern-*',
    timeFieldName: '@timestamp'
  });
}
const dataViewIdForLens = dataView.id;
```
## Refreshing a Lens embeddable

The Lens embeddable is handling data fetching internally, this means as soon as the props change, it will trigger a new request if necessary. However, in some situations it's necessary to trigger a refresh even if the configuration of the chart doesn't change at all. Refreshing is managed using search sessions is Lens. To trigger a refresh without changing the actual configuration of a Lens embeddable, follow these steps:
* Pull in the contract of the `data` plugin. It contains the session service at `plugins.data.search.session`.
* When loading the app containing a Lens embeddable, start a new session using `session.start`. It returns the current session id - keep it in the state of our app (e.g. a `useState` hook or your redux store)
* Pass the current session id to the Lens embeddable component via the `searchSessionId` property
* When refreshing, simply call `session.start` again and update your state - Lens will discard the existing cache and re-fetch even if the query doesn't change at all
* When unmounting your app, call `session.clear` to end the current session

# Lens Development

The following sections are concerned with developing the Lens plugin itself.
## Testing

Run all tests from the `x-pack` root directory

- Unit tests: `yarn test:jest x-pack/plugins/lens`
- Functional tests:
  - Run `node scripts/functional_tests_server`
  - Run `node ../scripts/functional_test_runner.js --config ./test/functional/apps/lens/group1/config.ts`
  - Run `node ../scripts/functional_test_runner.js --config ./test/functional/apps/lens/group2/config.ts`
  - Run `node ../scripts/functional_test_runner.js --config ./test/functional/apps/lens/group3/config.ts`
- API Functional tests:
  - Run `node scripts/functional_tests_server`
  - Run `node ../scripts/functional_test_runner.js --config ./test/api_integration/config.ts --grep=Lens`

## Developing tips

Lens state is kept in the Redux Store. To enable redux logger, open Chrome Developer Tools and type in the console: `window.ELASTIC_LENS_LOGGER=true`.

To simulate long running searches, set `data.search.aggs.shardDelay.enabled` in your `kibana.dev.yml` to true and set the dealy via console in the browser (e.g. for a 20 seconds delay): `window.ELASTIC_LENS_DELAY_SECONDS=20`.

## UI Terminology

Lens has a lot of UI elements – to make it easier to refer to them in issues or bugs, this is a hopefully complete list:

* **Top nav** Navigation menu on top of the app (contains Save button)
  * **Query bar** Input to enter KQL or Lucene query below the top nav
  * **Filter bar** Row of filter pills below the query bar
  * **Time picker** Global time range configurator right to the query bar
* **Data panel** Panel to the left showing the field list
  * **Field list** List of fields separated by available and empty fields in the data panel
  * **Index pattern chooser** Select element switching between index patterns
  * **Field filter** Search and dropdown to filter down the field list
  * **Field information popover** Popover showing data distribution; opening when clicking a field in the field list
* **Config panel** Panel to the right showing configuration of the current chart, separated by layers
  * **Layer panel** One of multiple panels in the config panel, holding configuration for separate layers
    * **Dimension trigger** Chart dimension like "X axis", "Break down by" or "Slice by" in the config panel
    * **Dimension container** Container shown when clicking a dimension trigger and contains the dimension settints
    * **Layer settings popover** Popover shown when clicking the button in the top left of a layer panel
* **Workspace panel** Center panel containing the chart preview, title and toolbar
  * **Chart preview** Full-sized rendered chart in the center of the screen
  * **Toolbar** Bar on top of the chart preview, containing the chart switcher to the left with chart specific settings right to it
    * **Chart switch** Select to change the chart type in the top left above the chart preview
    * **Chart settings popover** Popover shown when clicking the "Settings" button above the chart preview
* **Suggestion panel** Panel to the bottom showing previews for suggestions on how to change the current chart

![Layout](./layout.png "Layout")
