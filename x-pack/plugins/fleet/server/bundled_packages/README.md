# Fleet Bundled Packages

This directory contains "stack-aligned" packages that are bundled with Kibana in order to ensure consistency during Fleet's setup process that occurs on Kibana boot. Package should be stored as `.zip` files in this directory. To add or update a package's stored `.zip`, follow these steps: 

1. Download the `.zip` archive for a given package from the Elastic Package Registry service, e.g.

```
https://epr-snapshot.elastic.co/epr/apm/apm-8.1.0-dev1.zip
```

**It's important to use the `snapshot` environment of EPR in order to ensure the latest stack-aligned version of a given integration is what's provided for Fleet setup.**

2. Place the `.zip` file in `x-pack/plugins/fleet/bundled_packages` - the filename should be the full path value of the package from the endpoint above, e.g. `apm-8.1.0-dev1.zip`

3. Create a PR to merge the file change into `main`
