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
  {
    id: 'acme_backup',
    title: 'Backup Policies',
    text: 'Databases are backed up daily with weekly full snapshots and retained for 30 days. Backups are tested monthly for integrity and recoverability.',
  },
  {
    id: 'acme_deploy',
    title: 'Deployment Procedures',
    text: 'Applications are deployed via CI/CD pipelines using GitHub Actions. Rollbacks are automated in case of failures, and deployments require approvals from the responsible team.',
  },
  {
    id: 'acme_logging',
    title: 'Logging Practices',
    text: 'Logs from all services are centralized in Elasticsearch via Filebeat and Logstash, with dashboards available in Kibana for monitoring and troubleshooting.',
  },
  {
    id: 'acme_alerting',
    title: 'Alerting Policies',
    text: 'Critical alerts are sent via Slack and PagerDuty to the on-call team. Alerts are categorized by severity and handled according to the runbook instructions.',
  },
  {
    id: 'acme_api',
    title: 'API Guidelines',
    text: 'APIs follow REST principles, with versioning and authentication via OAuth2. Rate limits are enforced, and all endpoints are documented in the internal API portal.',
  },
  {
    id: 'acme_compliance',
    title: 'Compliance Requirements',
    text: 'ACME adheres to GDPR and SOC 2 compliance requirements. All user data is encrypted at rest and in transit.',
  },
  {
    id: 'acme_ci_cd',
    title: 'CI/CD Pipeline Details',
    text: 'ACME uses Jenkins and GitHub Actions for continuous integration and deployment. Pipelines include automated testing, linting, and deployment to staging before production release.',
  },
  {
    id: 'acme_incidents',
    title: 'Incident Management',
    text: 'All incidents are logged in Jira and tracked by severity. The on-call engineer is responsible for initial response, with postmortems conducted for P1/P2 incidents.',
  },
  {
    id: 'acme_storage',
    title: 'Storage Infrastructure',
    text: 'ACME storage includes AWS S3 buckets for object storage, EBS volumes for block storage, and replicated snapshots for disaster recovery.',
  },
  {
    id: 'acme_monitoring_tools',
    title: 'Monitoring Tools',
    text: 'ACME uses Prometheus for metrics collection, Grafana for dashboards, and Alertmanager for alerting. All monitoring data is centralized and available to relevant teams.',
  },
];
