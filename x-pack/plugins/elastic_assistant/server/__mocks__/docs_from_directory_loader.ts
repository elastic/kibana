/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Document } from 'langchain/document';

/**
 * Mock LangChain `Document`s loaded from a LangChain `DirectoryLoader`
 */
export const mockExampleQueryDocsFromDirectoryLoader: Document[] = [
  {
    pageContent:
      '[[esql-example-queries]]\n\nThe following is an example an ES|QL query:\n\n```\nFROM logs-*\n| WHERE NOT CIDR_MATCH(destination.ip, "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")\n| STATS destcount = COUNT(destination.ip) by user.name, host.name\n| ENRICH ldap_lookup_new ON user.name\n| WHERE group.name IS NOT NULL\n| EVAL follow_up = CASE(\n    destcount >= 100, "true",\n     "false")\n| SORT destcount desc\n| KEEP destcount, host.name, user.name, group.name, follow_up\n```\n',
    metadata: {
      source:
        '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/example_queries/esql_example_query_0001.asciidoc',
    },
  },
  {
    pageContent:
      '[[esql-example-queries]]\n\nThe following is an example an ES|QL query:\n\n```\nfrom logs-*\n| grok dns.question.name "%{DATA}\\\\.%{GREEDYDATA:dns.question.registered_domain:string}"\n| stats unique_queries = count_distinct(dns.question.name) by dns.question.registered_domain, process.name\n| where unique_queries > 5\n| sort unique_queries desc\n```\n',
    metadata: {
      source:
        '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/example_queries/esql_example_query_0002.asciidoc',
    },
  },
  {
    pageContent:
      '[[esql-example-queries]]\n\nThe following is an example an ES|QL query:\n\n```\nfrom logs-*\n| where event.code is not null\n| stats event_code_count = count(event.code) by event.code,host.name\n| enrich win_events on event.code with EVENT_DESCRIPTION\n| where EVENT_DESCRIPTION is not null and host.name is not null\n| rename EVENT_DESCRIPTION as event.description\n| sort event_code_count desc\n| keep event_code_count,event.code,host.name,event.description\n```\n',
    metadata: {
      source:
        '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/example_queries/esql_example_query_0003.asciidoc',
    },
  },
];
