# Index Management UI

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

## Index templates tab

### Quick steps for testing

By default, **legacy index templates** are not shown in the UI. Make them appear by creating one in Console:

```
PUT _template/template_1
{
  "index_patterns": ["foo*"]
}
```