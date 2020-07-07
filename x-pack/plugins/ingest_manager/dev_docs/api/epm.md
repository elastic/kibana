This document is part of the original drafts for ingest management documentation in `docs/ingest_manager` and may be outdated.
Overall documentation of Ingest Management is now maintained in the `elastic/stack-docs` repository.

# Elastic Package Manager API

The Package Manager offers an API. Here an example on how they can be used.

List installed packages:

```
curl localhost:5601/api/ingest_manager/epm/packages
```

Install a package:

```
curl -X POST localhost:5601/api/ingest_manager/epm/packages/iptables-1.0.4
```

Delete a package:

```
curl -X DELETE localhost:5601/api/ingest_manager/epm/packages/iptables-1.0.4
```
