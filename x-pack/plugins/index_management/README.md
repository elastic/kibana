# Index Management UI

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

## Index templates tab

### Quick steps for testing

By default, **legacy index templates** are not shown in the UI. Make them appear by creating one in Console:

```
PUT _template/template_1
{
  "index_patterns": ["foo*"]
}
```

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