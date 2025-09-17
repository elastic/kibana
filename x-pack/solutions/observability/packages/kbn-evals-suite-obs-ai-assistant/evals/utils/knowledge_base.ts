/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const testDocs = [
  {
    id: 'acme_teams',
    title: 'ACME DevOps Team Structure',
    text: 'ACME maintains three primary DevOps teams: Platform Infrastructure (responsible for cloud infrastructure and Kubernetes clusters), Application Operations (responsible for application deployments and monitoring), and Security Operations (responsible for security monitoring and compliance). Each team maintains a separate on-call rotation accessible via PagerDuty. The current on-call schedule is available in the #oncall Slack channel or through the PagerDuty integration in Kibana.',
  },
  {
    id: 'acme_monitoring',
    title: 'Alert Thresholds',
    text: 'Standard alert thresholds for ACME services are: API response time > 500ms (warning) or > 1s (critical), error rate > 1% (warning) or > 5% (critical), CPU usage > 80% (warning) or > 90% (critical), memory usage > 85% (warning) or > 95% (critical). Custom thresholds for specific services are documented in the service runbooks stored in Confluence under the "Service Specifications" space.',
  },
  {
    id: 'acme_infra',
    title: 'Database Infrastructure',
    text: 'Primary transactional data is stored in PostgreSQL clusters with read replicas in each region. Customer metadata is stored in MongoDB with M40 clusters in each region. Caching layer uses Redis Enterprise Cloud with 15GB instances. All database metrics are collected via Metricbeat with custom dashboards available under "ACME Databases" in Kibana. Database performance alerts are configured to notify the DBA team via the #db-alerts Slack channel.',
  },
  {
    id: 'acme_security',
    title: 'Security Practices',
    text: 'ACME follows strict security guidelines including regular audits, monitoring via Security Operations team, and compliance with internal policies.',
  },
  {
    id: 'acme_network',
    title: 'Network Architecture',
    text: 'ACME network consists of segmented VLANs for production, staging, and development. Firewalls, VPNs, and secure ingress/egress policies are applied.',
  },
];
