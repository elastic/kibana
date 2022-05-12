# Waterfall chart

## Introduction

The waterfall chart component aims to be agnostic in it's approach, so that a variety of consumers / solutions can use it. Some of Elastic Chart's features are used in a non-standard way to facilitate this flexibility, this README aims to cover some of the things that might be less obvious, and also provides a high level overview of implementation.

## Requirements for usage

The waterfall chart component asssumes that the consumer is making use of `KibanaReactContext`, and as such things like `useKibana` can be called. 

Consumers are also expected to be using the `<EuiThemeProvider />` so that the waterfall chart can apply styled-component styles based on the EUI theme.

These are the two hard requirements, but almost all plugins will be using these.

## Rendering

At it's core the watefall chart is a stacked bar chart that has been rotated through 90 degrees. As such it's important to understand that `x` is now represented as `y` and vice versa.

## Flexibility

This section aims to cover some things that are non-standard.

### Tooltip

By default the formatting of tooltip values is very basic, but for a waterfall chart there needs to be a great deal of flexibility to represent whatever breakdown you're trying to show.

As such a custom tooltip component is used. This custom component would usually only have access to some basic props that pertain to the values of the hovered bar. The waterfall chart component extends this by making us of a waterfall chart context. 

The custom tooltip component can use the context to access the full set of chart data, find the relevant items (those with the same `x` value) and call a custom `renderTooltipItem` for each item, `renderTooltipItem` will be passed `item.config.tooltipProps`. Every consumer can choose what they use for their `tooltipProps`. 

Some consumers might need colours, some might need iconography and so on. The waterfall chart doesn't make assumptions, and will render out the React content returned by `renderTooltipItem`.

IMPORTANT: `renderTooltipItem` is provided via context and not as a direct prop due to the fact the custom tooltip component would usually only have access to the props provided directly to it from Elastic Charts. 

### Colours

The easiest way to facilitate specific colours for each stack (let's say your colours are mapped to a constraint like mime type) is to assign the colour directly on your datum `config` property, and then access this directly in the `barStyleAccessor` function, e.g.

```
barStyleAccessor={(datum) => {
  return datum.datum.config.colour;
})
```

### Config

The notion of `config` has been mentioned already. But this is a place that consumers can store their solution specific properties. `renderTooltipItem` will make use of `config.tooltipProps`, and `barStyleAccessor` can make use of anything on `config`.

### Sticky top axis

By default there is no "sticky" axis functionality in Elastic Charts, therefore a second chart is rendered, this contains a replica of the top axis, and renders one empty data point (as a chart can't only have an axis). This second chart is then positioned in such a way that it covers the top of the real axis, and remains fixed.

## Data

The waterfall chart expects data in a relatively simple format, there are the usual plot properties (`x`, `y0`, and `y`) and then `config`. E.g.

```
const series = [
  {x: 0, y: 0, y: 100, config: { tooltipProps: { type: 'dns' }}},
  {x: 0, y0: 300, y: 500, config: { tooltipProps: { type: 'ssl' }}},
  {x: 1, y0: 250, y: 300, config: { tooltipProps: { propA: 'somethingBreakdownRelated' }}},
  {x: 1, y0: 500, y: 600, config: { tooltipProps: { propA: 'anotherBreakdown' }}},
]
```

Gaps in bars are fine, and to be expected for certain solutions.

## Sidebar items

The waterfall chart component again doesn't make assumptions about consumer's sidebar items' content, but the waterfall chart does handle the rendering so the sidebar can be aligned and rendered properly alongside the chart itself.

`sidebarItems` should be provided to the context, and a `renderSidebarItem` prop should be provided to the chart.

A sidebar is optional.

There is a great deal of flexibility here so that solutions can make use of this in the way they need. For example, if you'd like to add a toggle functionality, so that clicking an item shows / hides it's children, this would involve rendering your toggle in `renderSidebarItem` and then when clicked you can handle adjusting your data as necessary.

IMPORTANT: It is important to understand that the chart itself makes use of a fixed height. The sidebar will create a space that has a matching height. Each item is assigned equal space vertically via Flexbox, so that the items align with the relevant bar to the right (these are two totally different rendering contexts, with the chart itself sitting within a `canvas` element). So it's important that whatever content you choose to render here doesn't exceed the available height available to each item. The chart's height is calculated as `numberOfBars * 32`, so content should be kept within that `32px` threshold.

## Legend items

Much the same as with the sidebar items, no assumptions are made here, solutions will have different aims.

`legendItems` should be provided to the context, and a `renderLegendItem` prop should be provided to the chart.

A legend is optional.

## Overall usage

Pulling all of this together, things look like this (for a specific solution):

```
const renderSidebarItem: RenderItem<SidebarItem> = (item, index) => {
  return <MiddleTruncatedText text={`${index + 1}. ${item.url}`} />;
};

const renderLegendItem: RenderItem<LegendItem> = (item) => {
  return <EuiHealth color={item.colour}>{item.name}</EuiHealth>;
};

<WaterfallProvider
  data={series}
  sidebarItems={sidebarItems}
  legendItems={legendItems}
  renderTooltipItem={(tooltipProps) => {
    return <EuiHealth color={String(tooltipProps.colour)}>{tooltipProps.value}</EuiHealth>;
  }}
>
  <WaterfallChart
    tickFormat={(d: number) => `${Number(d).toFixed(0)} ms`}
    domain={{ min: domain.min, max: domain.max }}
    barStyleAccessor={(datum) => {
      return datum.datum.config.colour;
    }}
    renderSidebarItem={renderSidebarItem}
    renderLegendItem={renderLegendItem}
  />
</WaterfallProvider>
```

A solution could easily forego a sidebar and legend for a more minimalistic view, e.g. maybe a mini waterfall within a table column.


