/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// First step, select type, options (fields for each one underneath, all of them accept “Other settings” as a raw input):
// Filebeat Input
//  - List of file paths (ie.  “/var/log/*.log”)
// Filebeat Module
//  - Module name, choose from a list: system, apache2, nginx, mongodb, elasticsearch…
// Metricbeat Module
//  - Module name, choose from a list: system, apache2, nginx, mongodb… (this list is different from filebeat’s)
//  - hosts: list of hosts to query (ie. localhost:9200)
//  - period: 10s by default
// Output
//  - Output type, choose from a list: elasticsearch, logstash, kafka, console
//  - hosts: list of hosts (ie. https://…)
//  - username
//  - password
