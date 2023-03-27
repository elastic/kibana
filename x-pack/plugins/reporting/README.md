# Kibana Reporting

An awesome Kibana reporting plugin

## csv_searchsource. 
This is the endpoint used in the Discover UI. It must be replaced by csv_v2 at some point, when we have more capacity in reporting. https://github.com/elastic/kibana/issues/151190
## csv_searchsource_immediate.
This is a feature that some customers asked for quite awhile ago, but it should be deprecated. I chatted with Jason about it, and he's OK with us taking this out and replacing it in the UI with an async export option.
## csv_v2. 
This new endpoint is designed to have a more automation-friendly signature. It must replace csv_searchsource in the UI at some point, when there is more capacity in reporting. It will need a little more work to have parity: it needs to be able to export "unsaved" searches.