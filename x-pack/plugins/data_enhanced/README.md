# data_enhanced

The `data_enhanced` plugin is the x-pack counterpart to the OSS `data` plugin.

It exists to provide Elastic-licensed services, or parts of services, which
enhance existing OSS functionality from `data`.

Currently the `data_enhanced` plugin doesn't return any APIs which you can
consume directly, however it is possible that you are indirectly relying on the
enhanced functionality that it provides via the OSS `data` plugin.

Here is the functionality it adds:

## KQL Autocomplete

The OSS autocomplete service provides suggestions for field names and values
based on suggestion providers which are registered to the service. This plugin
registers the autocomplete provider for KQL to the OSS service.

## Async, Rollup, and EQL Search Strategies

This plugin enhances the OSS search service with an ES search strategy that
uses async search (or rollups) behind the scenes. It also registers an EQL
search strategy.

