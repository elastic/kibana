# Package installation by direct upload

Besides installing packages from the registry, packages can also be installed by direct upload.

Prerequisites:
* you need to know how to create a package archive from scratch. 
* this feature is only available for enterprise (or trial) users
* this is only meant for developers -- mostly those working on packages / integrations, but other developers might find this useful as well
* this feature only handles installation -- no upgrade, downgrade, or reinstallation. If you want to reinstall a package, you need to delete it first.

## Install a package

* `curl -X POST -u elastic:changeme http://localhost:5601/BASEPATH/api/fleet/epm/packages --data-binary @path/to/package_version.zip -H 'kbn-xsrf: xyz' -H 'Content-Type: application/zip'`

NOTE: be sure to use `--data-binary` or the package archive will be corrupted by curl (through base64 encoding? TODO: check).