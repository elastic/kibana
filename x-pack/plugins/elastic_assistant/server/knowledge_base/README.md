### Knowledge Base Assets

This directory contains assets for the Knowledge Base feature. The assets are used by the Elastic AI Assistant to answer questions about content that the underlying model may not have been trained on. Initial assets are provided for the following categories:

* ES|QL
  * General Documentation as from: https://github.com/elastic/elasticsearch/tree/main/docs/reference/esql
    * Excluding `functions/signature/*.svg`
  * ANTLR Language Definitions as from: https://github.com/elastic/elasticsearch/tree/main/x-pack/plugin/esql/src/main/antlr

The assets are stored in their original source format, so `.asciidoc` for documentation, and `.g4` and `.tokens` for the ANTLR language definitions. File names have been updated to be snake_case to satisfy Kibana linting rules.

### Future

Once asset format and chunking strategies are finalized, we may want to either move the assets to a shared package so they can be consumed by other plugins, or potentially ship the pre-packaged ELSER embeddings as part of a Fleet Integration. For now though, the assets will be included in their source format within the plugin, and can then be processed and embedded at runtime.