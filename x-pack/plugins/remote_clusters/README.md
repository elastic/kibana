# Remote Clusters

## Setting up a remote cluster

* Run `yarn es snapshot --license=trial` and log into kibana
* Create a local copy of the ES snapshot with `cp -R .es/8.10.0 .es/8.10.0-2`
* Start your local copy of the ES snapshot .es/8.10.0-2/bin/elasticsearch -E cluster.name=europe -E transport.port=9400
* Create a remote cluster using `127.0.0.1:9400` as seed node and proceed with the wizard
* Verify that your newly created remote cluster is shown as connected in the remote clusters list

## About

This plugin helps users manage their [remote clusters](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-remote-clusters.html), which enable cross-cluster search and cross-cluster replication.