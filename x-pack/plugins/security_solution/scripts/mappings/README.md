# Huge Indices with Unmapped Fields Generator/Loader Scripts

This script makes it easy to generate and load big amount of indices with huge amount of fields.
It is also easy to specify what portion of those fields should be unmapped across various indices.
The purpose of this scripts is to be able to test `_field_caps` APIs which we use to fetch fields,
especially with `include_unmapped` options set.

There are two different scripts:
1. `mappings_generator.js` which generates indices
2. `mappings_loader.js` which loads all generated indices to ES

## Examples.

### Generate 1k indices (split into 10 buckets with 100 indices each) with 10k fields (with 20% randomly unmapped fields within each index)

> `node mappings_generator.js --fieldsCount=10000 --indexCount=1000 --indexPrefix='.ds-huge' --unmappedRate=.2 --buckets=10 --outputDirectory='test_unmapped'`

The result of this operation will be 10 separate bucket folders within `test_unmapped`. Each bucket folder will contain a `mappings.json` file describing 100 indices.

Available attributes:
* `--fieldsCount` (*required*): the number of fields in generated index
* `--indexCount` (*required*): the number of indices to be generated
* `--indexPrefix` (*required*): the prefix for the generated indices
* `--unmappedRate` (*required*): the percentage of unmapped fields in each index (value ranges from 0.0 to 1.0)
* `--buckets` (*optional, default value is 1*): it is possible to split the generated indices mappings into the smaller chunks
* `--outputDirectory` (*required*): the output folder
* `--purgeOutputDirectory` (*optional, default value is false*): the flag indicating whether we should purge output folder before generating new mappings

### Load all generated buckets generated via previous command

> `node mappings_loader.js --mappings-dir='test_unmapped' --es-url=http://elastic:changeme@localhost:9200 --kibana-url=http://elastic:changeme@localhost:5601/kbn/app`


This script will go through each folder in the provided root folder (via `--mappings-dir`) and load each folder with mappings inside using `es_archiver` tool.


**NOTE:** The path to `es_archiver` is adjusted for the call of this script using `x-pack/plugins/security_solution/package.json`. If you call this script directly, you will need to adjust it accordingly.
