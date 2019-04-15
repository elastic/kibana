# Model without column references

In our current model we store the definitions of various columns in the query and reference it from various places by `queryId_columnId`. By doing so we have to update all references when doing changes to a column. This level of indirection introduces redundancy to our model, because the columns have to be in the correct order for correct data fetching anyway (e.g. the order of splitting by series and by time changes the result, but our model makes it easy to hit this class of errors because it can be expressed by referenced columns).

```json
query: [
  {
    "operator": "terms",
    "argument": {
      "field": "geo.src",
      "size": 5
    },
    "id": "series"
  },
  {
    "operator": "date_histogram",
    "argument": {
      "field": "timestamp",
      "interval": "d"
    },
    "id": "x"
  },
  {
    "operator": "avg",
    "argument": {
      "field": "bytes"
    },
    "id": "59786"
  },
],
private: {
  "xAxis": {
    "title": "X Axis",
    "columns": [
      "xyChartQuery_x" // can fall out of sync
    ]
  },
  "yAxis": {
    "title": "Y Axis",
    "columns": [
      "xyChartQuery_59786" // can fall out of sync
    ]
  },
  "seriesAxis": {
    "title": "Series Axis",
    "columns": [
      "xyChartQuery_series" // can fall out of sync
    ]
  },
  "displayType": "line",
  "stacked": false
}
```

Instead of storing the reference, we can remove the redundancy and just store how many columns of a certain type there are which implicitly defines which column maps to which axis. If the columns change place (e.g. because we are switching the split axis and the x axcis), it is only necessary to update the query, not the private state of a plugin. This also helps with inter-plugin-compatibility, because their state is also implicitly "updated".

Instead of completely decoupling the query building (data modeling) step from the chart configuration step, we fuse it into one logical thing in which the chart configuration is derived from the modeled data as far as possible. This also means there are never unused columns in the underlying data table which would have to be cleaned up somehow.


## Examples

XY chart (support splitting by series and multiple y axes)

```json
{
    "seriesAxes": 1, // first n columns are aggregations which split series (prob. on multiple levels)
    // x axis is implictly the column after the split columns, so nothing to store here (just a single one)
    // y axes are implicitly the columns left after the x axis, so nothing to store here
    "splitIndividually": false // if this is true, x axis column and split axes columns switch places
}
```

Pie chart (support multiple sub slices)

```json
{
    // angle axis is always the last column which has to contain a metric, nothing to store here
    // first n columns are slice axes which are nested by their order, nothing to store here
}
```

Pie chart (support multiple sub slices and chart splits)

```json
{
    "chartSplitAxes": 0 // first n columns aren't sub splits inside the same pie, but are put into individual charts
    // angle axis is always the last column which has to contain a metric, nothing to store here
    // remaining columns are slice axes which are nested by their order, nothing to store here
}
```

Scatter chart (supports color coding by category and sizing by additional metric)

```json
{
    "hasCategory": true, // if this is true, the first column is the category column
    "hasSizeDimension": false, // if this is true, the second respectively the first column (depending on whether hasCategory is true) is the value of the dot size
    // next column is the x value of the dot, so nothing to store here
    // next column is the y value of the dot, so nothing to store here
}
```

In most cases, updating to the new valid state can be done without changing the private state of the visualization. If it has to be done, it is very simple (e.g. increasing a number or flipping a boolean flag) and doesn't include validating references. It also makes it much harder to build configurations which don't make any sense (e.g. pointing the split series axis and the x axis to the same column).

## Empty slots

Empty slots or "holes" are harder to express with this approach. However it could be done with a special operation `undefined` which has the additional advantage or carrying over the empty slots to other chart configurations.

Often, empty slots might not even be necessary because we could switch to another chart type which supports the new data table instead (e.g. if a user deletes the x axis operation from a line chart, the editor switches to a single metric editor which can work with the single operation).