/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { http, HttpResponse } from 'msw';

const encoder = new TextEncoder();

export const handlers = [
  http.post('http://localhost/internal/bsearch', ({ request }) => {
    const stream = new ReadableStream({
      start(controller) {
        // Encode the string chunks using "TextEncoder".
        controller.enqueue(
          encoder.encode(
            '{"id":0,"result":{"rawResponse":{"took":0,"timed_out":false,"_shards":{"total":1,"successful":1,"skipped":0,"failed":0},"hits":{"total":1,"max_score":null,"hits":[{"_index":"logs-cloud_security_posture.findings_latest-default","_id":"N2S-qsgiL2iDYiw_SdPAz1w8AAAAAAAA","_score":null,"_source":{"agent":{"name":"kind-multi-control-plane","id":"564402d7-9715-4f5b-aa3a-b1ad7800d1e1","type":"cloudbeat","ephemeral_id":"de93df86-6a72-40b9-9098-1f3f41261a4a","version":"8.13.2"},"resource":{"sub_type":"directory","name":"/hostfs/etc/kubernetes/pki","raw":{"mode":"755","inode":"1032296","owner":"root","uid":"0","path":"/hostfs/etc/kubernetes/pki","gid":"0","sub_type":"directory","name":"pki","group":"root"},"id":"719df57f-2eec-519e-8479-6370173f7aa8","type":"file"},"cloud_security_posture":{"package_policy":{"id":"16aec061-cb66-472d-956a-51a23bcea333","revision":5}},"elastic_agent":{"id":"564402d7-9715-4f5b-aa3a-b1ad7800d1e1","version":"8.13.2","snapshot":false},"rule":{"references":"1. https://kubernetes.io/docs/admin/kube-apiserver/","impact":"None","description":"Ensure that the Kubernetes PKI directory and file ownership is set to `root:root`.","section":"Control Plane Node Configuration Files","default_value":"By default, the `/etc/kubernetes/pki/` directory and all of the files and directories contained within it, are set to be owned by the root user.\n","version":"1.0","rationale":"Kubernetes makes use of a number of certificates as part of its operation.\nYou should set the ownership of the directory containing the PKI information and all files in that directory to maintain their integrity.\nThe directory and files should be owned by `root:root`.","benchmark":{"name":"CIS Kubernetes V1.23","rule_number":"1.1.19","id":"cis_k8s","version":"v1.0.1","posture_type":"kspm"},"tags":["CIS","Kubernetes","CIS 1.1.19","Control Plane Node Configuration Files"],"remediation":"Run the below command (based on the file location on your system) on the Control Plane node.\nFor example,\n\n```\nchown -R root:root /etc/kubernetes/pki/\n```","audit":"Run the below command (based on the file location on your system) on the Control Plane node.\nFor example,\n\n```\nls -laR /etc/kubernetes/pki/\n```\n\nVerify that the ownership of all files and directories in this hierarchy is set to `root:root`.","name":"Ensure that the Kubernetes PKI directory and file ownership is set to root:root","id":"d98f24a9-e788-55d2-8b70-e9fe88311f9c","profile_applicability":"* Level 1 - Master Node"},"message":"Rule "Ensure that the Kubernetes PKI directory and file ownership is set to root:root": passed","result":{"evaluation":"passed","evidence":{"owner":"root","group":"root"},"expected":{"owner":"root","group":"root"}},"orchestrator":{"cluster":{"name":"kind-multi","id":"db550994-03ed-4654-89c6-5f09c8ea4ec2","version":"v1.23.12"},"type":"kubernetes"},"cluster_id":"db550994-03ed-4654-89c6-5f09c8ea4ec2","@timestamp":"2024-05-01T18:06:05.636Z","file":{"mode":"755","inode":"1032296","owner":"root","uid":"0","path":"/hostfs/etc/kubernetes/pki","extension":"","gid":"0","size":4096,"name":"pki","type":"directory","directory":"/hostfs/etc/kubernetes","group":"root"},"cloudbeat":{"commit_time":"0001-01-01T00:00:00Z","version":"8.13.2","policy":{"commit_time":"0001-01-01T00:00:00Z","version":"8.13.2"}},"ecs":{"version":"8.6.0"},"data_stream":{"namespace":"default","type":"logs","dataset":"cloud_security_posture.findings"},"host":{"name":"kind-multi-control-plane"},"event":{"agent_id_status":"auth_metadata_missing","sequence":1714586764,"ingested":"2024-05-01T18:16:10Z","created":"2024-05-01T18:06:05.636013991Z","kind":"state","id":"7bb297ad-498b-4b4e-8ac2-fff4c846b688","type":["info"],"category":["configuration"],"dataset":"cloud_security_posture.findings","outcome":"success"}},"sort":[1714586765636]}]},"aggregations":{"count":{"doc_count_error_upper_bound":0,"sum_other_doc_count":0,"buckets":[{"key":"passed","doc_count":1}]}}},"isPartial":false,"isRunning":false,"requestParams":{"method":"POST","path":"/logs-cloud_security_posture.findings_latest-*/_async_search","querystring":"batched_reduce_size=64&ccs_minimize_roundtrips=true&wait_for_completion_timeout=200ms&keep_on_completion=false&keep_alive=60000ms&ignore_unavailable=false"},"total":1,"loaded":1,"isRestored":false}}'
          )
        );
        controller.close();
      },
    });
    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
      },
    });
  }),
];
