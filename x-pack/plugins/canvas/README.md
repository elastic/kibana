# Canvas

"Never look back. The past is done. The future is a blank canvas." ― Suzy Kassem, Rise Up and Salute the Sun

## Getting Started

Canvas is included with X-Pack and requires a Basic license or better to use.

Canvas has its own build pipeline that gets triggered as part of `yarn kbn bootstrap`. However, should you ever need to run the build manually, like if you updated one of the plugins, you can do so with the following command:

```bash
yarn kbn run build:plugins --include canvas
```

### Developing in Canvas

As mentioned above, Canvas has its plugin build process, so if you are planning to work on any of the plugin code, you'll need to use the plugin build process.

**If you are not working on Canvas plugins, you can just start Kibana like normal, as long as you've used `yarn kbn bootstrap`**.

The easiest way to do develop on Canvas and have the plugins built automatically is to cd into the canvas plugin path and start the process from there:

```bash
# while in kibana/
cd x-pack/plugins/canvas
yarn start
```

There are several other scripts available once you are in that path as well.

- `yarn build:plugins` - local alias to build Canvas plugins, an alternative to using `kbn`.
- `yarn lint` - local linter setup, can also be used with the `--fix` flag for automatic fixes.
- `yarn test` - local test runner, does not require a real Kibana instance. Runs all the same unit tests the normal runner does, just limited to Canvas, and *waaaaaay* faster (currently 12 seconds or less).
- `yarn test:dev` - Same as above, but watches for changes and only runs tests for the given scope (browser, server, or common).

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

**How can I get an early build?**

Check the technical previews out, see http://canvas.elastic.co/stories/installing.html

**Where can I get screenshots?**

If you want a stream of conciousness of the absolute latest development, check out the technical preview microsite at http://canvas.elastic.co/
