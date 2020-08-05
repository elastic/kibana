# Cross-Cluster Replication

## Quick steps for testing cross-cluster replication

You can run a local cluster and simulate a remote cluster within a single Kibana directory.

1. Run `yarn es snapshot --license=trial` and kill the process once the snapshot has been installed.
2. Duplicate the ES installation by running `cp -aR .es/8.0.0 .es/8.0.0-2`.
3. Start your "local" cluster by running `.es/8.0.0/bin/elasticsearch` and starting Kibana.
4. Start your "remote" cluster by running `.es/8.0.0-2/bin/elasticsearch -E cluster.name=europe -E transport.port=9400`.
5. Index a document into your remote cluster by running `curl -X PUT http://elastic:changeme@localhost:9201/my-leader-index --data '{"settings":{"number_of_shards":1,"soft_deletes.enabled":true}}' --header "Content-Type: application/json"`.
Note that these settings are required for testing auto-follow pattern conflicts errors (see below).

Now you can create follower indices and auto-follow patterns to replicate the `my-leader-index`
index on the remote cluster that's available at `127.0.0.1:9400`.

### Auto-follow pattern conflict errors

You can view conflict errors by creating two auto-follow patterns with overlapping patterns (e.g. `my*` and `my-*`) that will both capture the `my-leader-index` index on your remote cluster. Run the curl command to create `my-leader-index2` on your remote cluster, since auto-follow patterns don't replicate existing indices.

Now, when you open the details flyout of one of the auto-follow patterns you will see a list of recent errors.  

![image](https://user-images.githubusercontent.com/1238659/79623769-e879b800-80d2-11ea-906d-0b2d6637c3a3.png)