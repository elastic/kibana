# Search Profiler

## About

The search profiler consumes the [Profile API](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-profile.html)
by sending a `search` API with `profile: true` enabled in the request body. The response contains
detailed information on how Elasticsearch executed the search request. People use this information
to understand why a search request might be slow.