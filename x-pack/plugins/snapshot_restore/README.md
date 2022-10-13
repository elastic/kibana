# Snapshot Restore

## Quick steps for testing

### File system

1. Add the file system path you want to use to elasticsearch.yml or as part of starting up ES. Note that this path should point to a directory that exists.

```
path:
  repo: /tmp/es-backups
```

or

```
yarn es snapshot --license=trial -E path.repo=/tmp/es-backups
```

2. Use Console or UI to add a repository. Use the file system path above as the `location` setting:

```
PUT /_snapshot/my_backup
{
  "type": "fs",
  "settings": {
    "location": "/tmp/es-backups",
    "chunk_size": "10mb"
  }
}
```

3. Adjust `settings` as necessary, all available settings can be found in docs:
https://www.elastic.co/guide/en/elasticsearch/reference/master/modules-snapshots.html#_shared_file_system_repository

### Readonly

Readonly repositories only take `url` setting. Documentation: https://www.elastic.co/guide/en/elasticsearch/reference/master/modules-snapshots.html#_read_only_url_repository

It's easy to set up a `file:` url:
```
PUT _snapshot/my_readonly_repository
{
  "type": "url",
  "settings": {
    "url": "file:///tmp/es-backups"
  }
}
```

### Source only

Source only repositories are special in that they are basically a wrapper around another repository type. Documentation: https://www.elastic.co/guide/en/elasticsearch/reference/master/modules-snapshots.html#_source_only_repository

This means that the settings that are available depends on the `delegate_type` parameter. For example, this source only repository delegates to `fs` (file system) type, so all file system rules and available settings apply:

```
PUT _snapshot/my_src_only_repository
{
  "type" : "source",
  "settings" : {
    "delegate_type" : "fs",
    "location" : "/tmp/es-backups"
  }
}
```

### Plugin-based repositories:

There is one official repository plugin available: HDFS. You can find the repository settings in the docs: https://www.elastic.co/guide/en/elasticsearch/plugins/master/repository-hdfs-config.html.

To run ES with plugins:

1. Run `yarn es snapshot` from the Kibana directory like normal, then exit out of process.
2. `cd .es/8.0.0`
3. `bin/elasticsearch-plugin install https://snapshots.elastic.co/downloads/elasticsearch-plugins/repository-hdfs/repository-hdfs-8.0.0-SNAPSHOT.zip`
4. Run `bin/elasticsearch` from the `.es/8.0.0` directory. Otherwise, starting ES with `yarn es snapshot` would overwrite the plugins you just installed.