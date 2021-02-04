# Resolver Schemas

## Introduction

In an effort to make resolver able to graph more data sources, we found a need for a _**schema**_ to describe how
resolver should approach graphing a data source. At its basic level a schema describes how the graph should be displayed.
Specifically how to find nodes in the graph (what field to use as the ID) and how to draw lines between nodes in the graph
(the edges).

As of 7.11 we do not currently allow the user to graph their own data. At this time we provide support (i.e. schemas)
for the elastic endpoint and winlogbeat's sysmon data.

## Schema Format

The predefined schemas are located here <https://github.com/elastic/kibana/blob/master/x-pack/plugins/security_solution/server/endpoint/routes/resolver/entity.ts#L34>

```typescript
const supportedSchemas: SupportedSchema[] = [
  {
    name: 'endpoint',
    constraints: [
      {
        field: 'agent.type',
        value: 'endpoint',
      },
    ],
    schema: {
      id: 'process.entity_id',
      parent: 'process.parent.entity_id',
      ancestry: 'process.Ext.ancestry',
      name: 'process.name',
    },
  },
  {
    name: 'winlogbeat',
    constraints: [
      {
        field: 'agent.type',
        value: 'winlogbeat',
      },
      {
        field: 'event.module',
        value: 'sysmon',
      },
    ],
    schema: {
      id: 'process.entity_id',
      parent: 'process.parent.entity_id',
      name: 'process.name',
    },
  },
];
```

## Schema Flow

When a user clicks on the _analyze event_ icon in the Security Solution app, a request is made to `/entity` with the
`_id` field from the document (the internal Elasticsearch ID for the document). The `/entity` API grabs the
document from Elasticsearch and determines which predefined schema profile matches the document. To determine which
profile matches, the API uses the `constraints` array in the schema and tests that the document has the `value` for
each of the `field`.

For the elastic endpoint schema, the constraints specifies that the document must have `agent.type` equal to `endpoint`
to match the schema. For winlogbeat, the constraints specifies that the document must have `agent.type` equal to
`winlogbeat` and `event.module` equal to `sysmon`. The API also requires that the document have the `schema.id` field
present and that it not be set to an empty string. For both the elastic endpoint and winlogbeat this is the field
`process.entity_id`.

If the `/entity` API finds a matching schema, then it returns the `schema` portion of the above `supportedSchemas`
variable.

The frontend then passes parts of the schema to additional backend API calls (e.g the new `/tree` API). This allows
the backend to construct the queries correctly to return a tree that adheres to the data source's schema.
