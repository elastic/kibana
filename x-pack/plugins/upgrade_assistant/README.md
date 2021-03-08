# Upgrade Assistant

## About

Upgrade Assistant helps users prepare their Stack for being upgraded to the next major. Its primary
purposes are to:

* **Surface deprecations.** Deprecations are features that are currently being used that will be
removed in the next major. Surfacing tells the user that there's a problem preventing them
from upgrading.
* **Migrate from deprecation features to supported features.** This addresses the problem, clearing
the path for the upgrade. Generally speaking, once all deprecations are addressed, the user can
safely upgrade.

### Deprecations

There are two sources of deprecation information:

* [**Deprecation Info API.**](https://www.elastic.co/guide/en/elasticsearch/reference/master/migration-api-deprecation.html)
This is information about cluster, node, and index level settings that use deprecated features that
will be removed or changed in the next major version. Currently, only cluster and index deprecations
will be surfaced in the Upgrade Assistant. ES server engineers are responsible for adding
deprecations to the Deprecation Info API.
* [**Deprecation logs.**](https://www.elastic.co/guide/en/elasticsearch/reference/current/logging.html#deprecation-logging)
These surface runtime deprecations, e.g. a Painless script that uses a deprecated accessor or a
request to a deprecated API. These are also generally surfaced as deprecation headers within the
response. Even if the cluster state is good, app maintainers need to watch the logs in case
deprecations are discovered as data is migrated.

### Fixing problems

Problems can be fixed at various points in the upgrade process. The Upgrade Assistant supports
various upgrade paths and surfaces various types of upgrade-related issues.

* **Fixing deprecated cluster settings pre-upgrade.** This generally requires fixing some settings
in `elasticsearch.yml`.
* **Migrating indices data pre-upgrade.** This can involve deleting indices so that ES can rebuild
them in the new version, reindexing them so that they're built using a new Lucene version, or
applying a migration script that reindexes them with new settings/mappings/etc.
* **Migrating indices data post-upgrade.** As was the case with APM in the 6.8->7.x upgrade,
sometimes the new data format isn't forwards-compatible. In these cases, the user will perform the
upgrade first and then use the Upgrade Assistant to reindex their data to be compatible with the new
version.

Deprecations can be handled in a number of ways:

* **Reindexing.** When a user's index contains deprecations (e.g. mappings) a reindex solves them.
Upgrade Assistant contains migration scripts that are executed as part of the reindex process.
The user will see a "Reindex" button they can click which will apply this script and perform the
reindex.
  * Reindexing is an atomic process in Upgrade Assistant, so that ingestion is never disrupted.
    It works like this:
    * Create a new index with a "reindexed-" prefix ([#30114](https://github.com/elastic/kibana/pull/30114)).
    * Create an index alias pointing from the original index name to the prefixed index name.
    * Reindex from the original index into the prefixed index.
    * Delete the old index and rename the prefixed index.
  * Some apps might require custom scripts, as was the case with APM ([#29845](https://github.com/elastic/kibana/pull/29845)).
    In that case the migration performed a reindex with a Painless script (covered by automated tests)
    that made the required changes to the data.
* **Update index settings.** Some index settings will need to be updated, which doesn't require a
reindex. An example of this is the "Fix" button that was added for metricbeat and filebeat indices
([#32829](https://github.com/elastic/kibana/pull/32829), [#33439](https://github.com/elastic/kibana/pull/33439)).
* **Following the docs.** The Deprecation Info API provides links to the deprecation docs. Users
will follow these docs to address the problem and make these warnings or errors disappear in the
Upgrade Assistant.
* **Stopping/restarting tasks and jobs.** Users had to stop watches and ML jobs and restart them as
soon as reindexing was complete ([#29663](https://github.com/elastic/kibana/pull/29663)).