[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsMigrationVersion

# Interface: SavedObjectsMigrationVersion

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsMigrationVersion

Information about the migrations that have been applied to this SavedObject.
When Kibana starts up, KibanaMigrator detects outdated documents and
migrates them based on this value. For each migration that has been applied,
the plugin's name is used as a key and the latest migration version as the
value.

**`example`**
migrationVersion: {
  dashboard: '7.1.1',
  space: '6.6.6',
}

## Indexable

▪ [pluginName: `string`]: `string`
