# Index Management UI
## Extensions service
This service is exposed from the Index Management setup contract and can be used to add content to the indices list and the index details page. 
### Extensions to the indices list
- `addBanner(banner: any)`: adds a banner on top of the indices list, for example when some indices run into an ILM issue
- `addFilter(filter: any)`: adds a filter to the indices list, for example to filter indices managed by ILM 
- `addToggle(toggle: any)`: adds a toggle to the indices list, for example to display hidden indices

#### Extensions to the indices list and the index details page
- `addAction(action: any)`: adds an option to the "manage index" menu, for example to add an ILM policy to the index
- `addBadge(badge: any)`: adds a badge to the index name, for example to indicate frozen, rollup or follower indices

#### Extensions to the index details page
- `addIndexDetailsTab(tab: IndexDetailsTab)`: adds a tab to the index details page. The tab has the following interface:

```ts
interface IndexDetailsTab {
  // a unique key to identify the tab
  id: IndexDetailsTabId;
  // a text that is displayed on the tab label, usually a Formatted message component
  name: ReactNode;
  // a function that renders the content of the tab
  renderTabContent: (args: {
    index: Index;
    getUrlForApp: ApplicationStart['getUrlForApp'];
  }) => ReturnType<FunctionComponent>;
  // a number to specify the order of the tabs
  order: number;
  // an optional function to return a boolean for when to render the tab
  // if omitted, the tab is always rendered
  shouldRenderTab?: (args: { index: Index }) => boolean;
}
```

An example of adding an ILM tab can be found in [this file](https://github.com/elastic/kibana/blob/main/x-pack/plugins/index_lifecycle_management/public/extend_index_management/components/index_lifecycle_summary.tsx#L250).

- `setIndexOverviewContent(content: IndexOverviewContent)`: replaces the default content in the overview tab (code block describing adding documents to the index) with the custom content. The custom content has the following interface: 
```ts
interface IndexOverviewContent {
  renderContent: (args: {
    index: Index;
    getUrlForApp: ApplicationStart['getUrlForApp'];
  }) => ReturnType<FunctionComponent>;
```

## Indices tab

### Quick steps for testing

Create an index with special characters and verify it renders correctly:

```
# Renders as %{[@metadata][beat]}-%{[@metadata][version]}-2020.08.23
PUT %25%7B%5B%40metadata%5D%5Bbeat%5D%7D-%25%7B%5B%40metadata%5D%5Bversion%5D%7D-2020.08.23
```

## Data streams tab

### Quick steps for testing

Create a data stream using Console and you'll be able to view it in the UI:

```
# Configure template for creating a data stream
PUT _index_template/ds
{
  "index_patterns": ["ds"],
  "data_stream": {}
}

# Add a document to the data stream
POST ds/_doc
{
  "@timestamp": "2020-01-27"
}
```

Create a data stream with special characters and verify it renders correctly:

```
# Configure template for creating a data stream
PUT _index_template/special_ds
{
  "index_patterns": ["%{[@metadata][beat]}-%{[@metadata][version]}-2020.08.23"],
  "data_stream": {}
}

# Add a document to the data stream, which will render as %{[@metadata][beat]}-%{[@metadata][version]}-2020.08.23
POST %25%7B%5B%40metadata%5D%5Bbeat%5D%7D-%25%7B%5B%40metadata%5D%5Bversion%5D%7D-2020.08.23/_doc
{
  "@timestamp": "2020-01-27"
}
```

Create a data stream configured with data stream lifecyle.

```
PUT _index_template/my-index-template
{
  "index_patterns": ["my-data-stream*"],
  "data_stream": { },
  "priority": 500,
  "template": {
    "lifecycle": {
      "data_retention": "7d"
    }
  },
  "_meta": {
    "description": "Template with data stream lifecycle"
  }
}
```

```
PUT _data_stream/my-data-stream
```

## Index templates tab

### Quick steps for testing

**Legacy index templates** are only shown in the UI on stateful _and_ if a user has existing legacy index templates. You can test this functionality by creating one in Console:

```
PUT _template/template_1
{
  "index_patterns": ["foo*"]
}
```

On serverless, Elasticsearch does not support legacy index templates and therefore this functionality is disabled in Kibana via the config `xpack.index_management.enableLegacyTemplates`. For more details, see [#163518](https://github.com/elastic/kibana/pull/163518).

To test **Cloud-managed templates**:

1. Add `cluster.metadata.managed_index_templates` setting via Dev Tools:

```
PUT /_cluster/settings
{
  "persistent": {
    "cluster.metadata.managed_index_templates": ".cloud-"
  }
}
```

2. Create a template with the format: `.cloud-<template_name>` via Dev Tools.

```
PUT _template/.cloud-example
{
  "index_patterns": [ "foobar*"]
}
```

The UI will now prevent you from editing or deleting this template.

In 7.x, the UI supports types defined as part of the mappings for legacy index templates. To test this out, use the "Load JSON" feature and verify the custom type is preserved:

```
{
  "my_custom_type": {
    "_source": {
      "enabled": false
    },
    "properties": {
      "name1": {
        "type": "keyword"
      }
    }
  }
}
```
