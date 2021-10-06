/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetPackagesResponse } from '../../../public/types';
import { ElasticsearchAssetType, KibanaSavedObjectType } from '../../../common/types';

export const response: GetPackagesResponse['response'] = [
  {
    name: 'apache',
    title: 'Apache',
    version: '0.8.1',
    release: 'experimental',
    description: 'Apache Integration',
    type: 'integration',
    download: '/epr/apache/apache-0.8.1.zip',
    path: '/package/apache/0.8.1',
    icons: [
      {
        src: '/img/logo_apache.svg',
        path: '/package/apache/0.8.1/img/logo_apache.svg',
        title: 'Apache Logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'apache',
        title: 'Apache logs and metrics',
        description: 'Collect logs and metrics from Apache instances',
      },
    ],
    id: 'apache',
    status: 'not_installed',
  },
  {
    name: 'apm',
    title: 'Elastic APM',
    version: '0.4.0',
    release: 'beta',
    description: 'Ingest APM data',
    type: 'integration',
    download: '/epr/apm/apm-0.4.0.zip',
    path: '/package/apm/0.4.0',
    icons: [
      {
        src: '/img/logo_apm.svg',
        path: '/package/apm/0.4.0/img/logo_apm.svg',
        title: 'APM Logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'apmserver',
        title: 'Elastic APM Integration',
        description: 'Elastic APM Integration',
      },
    ],
    id: 'apm',
    status: 'not_installed',
  },
  {
    name: 'auditd',
    title: 'Auditd',
    version: '1.2.0',
    release: 'ga',
    description: 'This Elastic integration collects and parses logs from the Audit daemon (auditd)',
    type: 'integration',
    download: '/epr/auditd/auditd-1.2.0.zip',
    path: '/package/auditd/1.2.0',
    icons: [
      {
        src: '/img/linux.svg',
        path: '/package/auditd/1.2.0/img/linux.svg',
        title: 'linux',
        size: '299x354',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'auditd',
        title: 'Auditd logs',
        description: 'Collect logs from Auditd instances',
      },
    ],
    id: 'auditd',
    status: 'not_installed',
  },
  {
    name: 'aws',
    title: 'AWS',
    version: '0.10.7',
    release: 'beta',
    description: 'This integration collects logs and metrics from Amazon Web Services (AWS)',
    type: 'integration',
    download: '/epr/aws/aws-0.10.7.zip',
    path: '/package/aws/0.10.7',
    icons: [
      {
        src: '/img/logo_aws.svg',
        path: '/package/aws/0.10.7/img/logo_aws.svg',
        title: 'logo aws',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'billing',
        title: 'AWS Billing',
        description: 'Collect AWS billing metrics',
        icons: [
          {
            src: '/img/logo_billing.svg',
            path: '/package/aws/0.10.7/img/logo_billing.svg',
            title: 'AWS Billing logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'cloudtrail',
        title: 'AWS Cloudtrail',
        description: 'Collect logs from AWS Cloudtrail',
        icons: [
          {
            src: '/img/logo_cloudtrail.svg',
            path: '/package/aws/0.10.7/img/logo_cloudtrail.svg',
            title: 'AWS Cloudtrail logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'cloudwatch',
        title: 'AWS CloudWatch',
        description: 'Collect logs and metrics from CloudWatch',
        icons: [
          {
            src: '/img/logo_cloudwatch.svg',
            path: '/package/aws/0.10.7/img/logo_cloudwatch.svg',
            title: 'AWS CloudWatch logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'dynamodb',
        title: 'AWS DynamoDB',
        description: 'Collect AWS DynamoDB metrics',
        icons: [
          {
            src: '/img/logo_dynamodb.svg',
            path: '/package/aws/0.10.7/img/logo_dynamodb.svg',
            title: 'AWS DynamoDB logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'ebs',
        title: 'AWS EBS',
        description: 'Collect AWS EBS metrics',
        icons: [
          {
            src: '/img/logo_ebs.svg',
            path: '/package/aws/0.10.7/img/logo_ebs.svg',
            title: 'AWS EBS logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'ec2',
        title: 'AWS EC2',
        description: 'Collect logs and metrics from EC2 service',
        icons: [
          {
            src: '/img/logo_ec2.svg',
            path: '/package/aws/0.10.7/img/logo_ec2.svg',
            title: 'AWS EC2 logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'elb',
        title: 'AWS ELB',
        description: 'Collect logs and metrics from ELB service',
        icons: [
          {
            src: '/img/logo_elb.svg',
            path: '/package/aws/0.10.7/img/logo_elb.svg',
            title: 'AWS ELB logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'lambda',
        title: 'AWS Lambda',
        description: 'Collect AWS Lambda metrics',
        icons: [
          {
            src: '/img/logo_lambda.svg',
            path: '/package/aws/0.10.7/img/logo_lambda.svg',
            title: 'AWS Lambda logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'natgateway',
        title: 'AWS NATGateway',
        description: 'Collect AWS NATGateway metrics',
        icons: [
          {
            src: '/img/logo_natgateway.svg',
            path: '/package/aws/0.10.7/img/logo_natgateway.svg',
            title: 'AWS NATGateway logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'rds',
        title: 'AWS RDS',
        description: 'Collect AWS RDS metrics',
        icons: [
          {
            src: '/img/logo_rds.svg',
            path: '/package/aws/0.10.7/img/logo_rds.svg',
            title: 'AWS RDS logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 's3',
        title: 'AWS S3',
        description: 'Collect AWS S3 metrics',
        icons: [
          {
            src: '/img/logo_s3.svg',
            path: '/package/aws/0.10.7/img/logo_s3.svg',
            title: 'AWS S3 logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'sns',
        title: 'AWS SNS',
        description: 'Collect AWS SNS metrics',
        icons: [
          {
            src: '/img/logo_sns.svg',
            path: '/package/aws/0.10.7/img/logo_sns.svg',
            title: 'AWS SNS logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'sqs',
        title: 'AWS SQS',
        description: 'Collect AWS SQS metrics',
        icons: [
          {
            src: '/img/logo_sqs.svg',
            path: '/package/aws/0.10.7/img/logo_sqs.svg',
            title: 'AWS SQS logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'transitgateway',
        title: 'AWS Transit Gateway',
        description: 'Collect AWS Transit Gateway metrics',
        icons: [
          {
            src: '/img/logo_transitgateway.svg',
            path: '/package/aws/0.10.7/img/logo_transitgateway.svg',
            title: 'AWS Transit Gateway logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'usage',
        title: 'AWS Usage',
        description: 'Collect AWS Usage metrics',
      },
      {
        name: 'vpcflow',
        title: 'AWS VPC Flow',
        description: 'Collect AWS vpcflow logs',
        icons: [
          {
            src: '/img/logo_vpcflow.svg',
            path: '/package/aws/0.10.7/img/logo_vpcflow.svg',
            title: 'AWS VPC logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'vpn',
        title: 'AWS VPN',
        description: 'Collect AWS VPN metrics',
        icons: [
          {
            src: '/img/logo_vpn.svg',
            path: '/package/aws/0.10.7/img/logo_vpn.svg',
            title: 'AWS VPN logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
    ],
    id: 'aws',
    status: 'not_installed',
  },
  {
    name: 'azure',
    title: 'Azure Logs',
    version: '0.8.5',
    release: 'beta',
    description: 'This Elastic integration collects logs from Azure',
    type: 'integration',
    download: '/epr/azure/azure-0.8.5.zip',
    path: '/package/azure/0.8.5',
    icons: [
      {
        src: '/img/azure_logs_logo.png',
        path: '/package/azure/0.8.5/img/azure_logs_logo.png',
        title: 'logo azure',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'adlogs',
        title: 'Azure Active Directory logs',
        description: 'Azure Directory logs integration',
        icons: [
          {
            src: '/img/active_directory_logo.png',
            path: '/package/azure/0.8.5/img/active_directory_logo.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'platformlogs',
        title: 'Azure platform logs',
        description: 'Azure platform logs integration',
        icons: [
          {
            src: '/img/platformlogs_logo.png',
            path: '/package/azure/0.8.5/img/platformlogs_logo.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'activitylogs',
        title: 'Azure activity logs',
        description: 'Azure activity logs integration',
        icons: [
          {
            src: '/img/platformlogs_logo.png',
            path: '/package/azure/0.8.5/img/platformlogs_logo.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'springcloudlogs',
        title: 'Azure Spring Cloud logs',
        description: 'Azure Spring Cloud logs integration',
        icons: [
          {
            src: '/img/spring_logs.svg',
            path: '/package/azure/0.8.5/img/spring_logs.svg',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
    ],
    id: 'azure',
    status: 'not_installed',
  },
  {
    name: 'azure_application_insights',
    title: 'Azure Application Insights Metrics Overview',
    version: '0.1.0',
    release: 'beta',
    description: 'Azure Application Insights',
    type: 'integration',
    download: '/epr/azure_application_insights/azure_application_insights-0.1.0.zip',
    path: '/package/azure_application_insights/0.1.0',
    icons: [
      {
        src: '/img/app_insights.png',
        path: '/package/azure_application_insights/0.1.0/img/app_insights.png',
        title: 'logo docker',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'app_insights',
        title: 'Azure Application Insights metrics',
        description: 'Azure Application Insights Metrics Integration',
        icons: [
          {
            src: '/img//app_insights.png',
            path: '/package/azure_application_insights/0.1.0/img/app_insights.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'app_state',
        title: 'Azure Application State Insights metrics',
        description: 'Azure Application State Insights Metrics Integration',
        icons: [
          {
            src: '/img/application_insights_blue.png',
            path: '/package/azure_application_insights/0.1.0/img/application_insights_blue.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
    ],
    id: 'azure_application_insights',
    status: 'not_installed',
  },
  {
    name: 'azure_metrics',
    title: 'Azure resource metrics',
    version: '0.3.2',
    release: 'beta',
    description: 'This Elastic integration collects and aggregates metrics from Azure resources',
    type: 'integration',
    download: '/epr/azure_metrics/azure_metrics-0.3.2.zip',
    path: '/package/azure_metrics/0.3.2',
    icons: [
      {
        src: '/img/azure_metrics_logo.png',
        path: '/package/azure_metrics/0.3.2/img/azure_metrics_logo.png',
        title: 'logo docker',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'monitor',
        title: 'Azure Monitor metrics',
        description: 'Azure Monitor Metrics Integration',
        icons: [
          {
            src: '/img/monitor_logo.png',
            path: '/package/azure_metrics/0.3.2/img/monitor_logo.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'compute_vm',
        title: 'Azure Virtual Machines metrics',
        description: 'Azure Virtual Machines Metrics Integration',
        icons: [
          {
            src: '/img/compute_vm_logo.png',
            path: '/package/azure_metrics/0.3.2/img/compute_vm_logo.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'compute_vm_scaleset',
        title: 'Azure Virtual Machines Scaleset metrics',
        description: 'Azure Virtual Machines Scaleset Metrics Integration',
        icons: [
          {
            src: '/img/compute_vm_scaleset_logo.png',
            path: '/package/azure_metrics/0.3.2/img/compute_vm_scaleset_logo.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'container_registry',
        title: 'Azure Container Registry metrics',
        description: 'Azure Container Registry Metrics Integration',
        icons: [
          {
            src: '/img/container_registry_logo.png',
            path: '/package/azure_metrics/0.3.2/img/container_registry_logo.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'container_instance',
        title: 'Azure Container Instance metrics',
        description: 'Azure Container Instance Metrics Integration',
        icons: [
          {
            src: '/img/container_instance_logo.png',
            path: '/package/azure_metrics/0.3.2/img/container_instance_logo.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'container_service',
        title: 'Azure Container Service metrics',
        description: 'Azure Container Service Metrics Integration',
        icons: [
          {
            src: '/img/container_service_logo.png',
            path: '/package/azure_metrics/0.3.2/img/container_service_logo.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'database_account',
        title: 'Azure Database Account metrics',
        description: 'Azure Database Account Metrics Integration',
        icons: [
          {
            src: '/img/database_account_logo.png',
            path: '/package/azure_metrics/0.3.2/img/database_account_logo.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'storage_account',
        title: 'Azure Storage Account metrics',
        description: 'Azure Storage Account Metrics Integration',
        icons: [
          {
            src: '/img/storage_account_logo.png',
            path: '/package/azure_metrics/0.3.2/img/storage_account_logo.png',
            title: 'logo azure',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
    ],
    id: 'azure_metrics',
    status: 'not_installed',
  },
  {
    name: 'barracuda',
    title: 'Barracuda',
    version: '0.4.0',
    release: 'experimental',
    description: 'Barracuda Integration',
    type: 'integration',
    download: '/epr/barracuda/barracuda-0.4.0.zip',
    path: '/package/barracuda/0.4.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/barracuda/0.4.0/img/logo.svg',
        title: 'Barracuda logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'barracuda',
        title: 'Barracuda logs',
        description: 'Collect Barracuda logs from syslog or a file.',
      },
    ],
    id: 'barracuda',
    status: 'not_installed',
  },
  {
    name: 'bluecoat',
    title: 'Blue Coat Director',
    version: '0.3.0',
    release: 'experimental',
    description: 'Blue Coat Director Integration',
    type: 'integration',
    download: '/epr/bluecoat/bluecoat-0.3.0.zip',
    path: '/package/bluecoat/0.3.0',
    policy_templates: [
      {
        name: 'director',
        title: 'Blue Coat Director',
        description: 'Collect Blue Coat Director logs from syslog or a file.',
      },
    ],
    id: 'bluecoat',
    status: 'not_installed',
  },
  {
    name: 'carbonblack_edr',
    title: 'VMware Carbon Black EDR',
    version: '0.2.0',
    release: 'experimental',
    description: 'Carbon Black EDR Integration',
    type: 'integration',
    download: '/epr/carbonblack_edr/carbonblack_edr-0.2.0.zip',
    path: '/package/carbonblack_edr/0.2.0',
    policy_templates: [
      {
        name: 'log',
        title: 'Carbon Black EDR logs',
        description: 'Collect logs from Carbon Black EDR',
      },
    ],
    id: 'carbonblack_edr',
    status: 'not_installed',
  },
  {
    name: 'cef',
    title: 'CEF',
    version: '0.5.2',
    release: 'experimental',
    description: 'This Elastic integration collects logs in common event format (CEF)',
    type: 'integration',
    download: '/epr/cef/cef-0.5.2.zip',
    path: '/package/cef/0.5.2',
    policy_templates: [
      {
        name: 'cef',
        title: 'CEF logs',
        description: 'Collect logs from CEF instances',
      },
    ],
    id: 'cef',
    status: 'not_installed',
  },
  {
    name: 'checkpoint',
    title: 'Check Point',
    version: '0.8.2',
    release: 'experimental',
    description: 'This Elastic integration collects logs from Check Point products',
    type: 'integration',
    download: '/epr/checkpoint/checkpoint-0.8.2.zip',
    path: '/package/checkpoint/0.8.2',
    icons: [
      {
        src: '/img/checkpoint-logo.svg',
        path: '/package/checkpoint/0.8.2/img/checkpoint-logo.svg',
        title: 'Check Point',
        size: '216x216',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'checkpoint',
        title: 'Check Point logs',
        description: 'Collect logs from Check Point instances',
      },
    ],
    id: 'checkpoint',
    status: 'not_installed',
  },
  {
    name: 'cisco',
    title: 'Cisco',
    version: '0.10.0',
    release: 'experimental',
    description: 'Cisco Integration',
    type: 'integration',
    download: '/epr/cisco/cisco-0.10.0.zip',
    path: '/package/cisco/0.10.0',
    icons: [
      {
        src: '/img/cisco.svg',
        path: '/package/cisco/0.10.0/img/cisco.svg',
        title: 'cisco',
        size: '216x216',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'cisco',
        title: 'Cisco logs',
        description: 'Collect logs from Cisco instances',
      },
    ],
    id: 'cisco',
    status: 'not_installed',
  },
  {
    name: 'crowdstrike',
    title: 'CrowdStrike',
    version: '0.6.0',
    release: 'experimental',
    description: 'CrowdStrike Integration',
    type: 'integration',
    download: '/epr/crowdstrike/crowdstrike-0.6.0.zip',
    path: '/package/crowdstrike/0.6.0',
    icons: [
      {
        src: '/img/logo-integrations-crowdstrike.svg',
        path: '/package/crowdstrike/0.6.0/img/logo-integrations-crowdstrike.svg',
        title: 'CrowdStrike',
        size: '216x216',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'crowdstrike',
        title: 'CrowdStrike Falcon logs',
        description: 'Collect logs from CrowdStrike Falcon',
      },
    ],
    id: 'crowdstrike',
    status: 'not_installed',
  },
  {
    name: 'cyberark',
    title: 'Cyber-Ark - Deprecated',
    version: '0.3.0',
    release: 'experimental',
    description:
      "Cyber-Ark Integration - Deprecated: Use 'CyberArk Privileged Access Security' instead.",
    type: 'integration',
    download: '/epr/cyberark/cyberark-0.3.0.zip',
    path: '/package/cyberark/0.3.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/cyberark/0.3.0/img/logo.svg',
        title: 'CyberArk logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'cyberark',
        title: 'CyberArk logs',
        description: 'Collect CyberArk logs from syslog or a file.',
      },
    ],
    id: 'cyberark',
    status: 'not_installed',
  },
  {
    name: 'cyberarkpas',
    title: 'CyberArk Privileged Access Security',
    version: '1.2.3',
    release: 'beta',
    description: 'This Elastic integration collects logs from CyberArk',
    type: 'integration',
    download: '/epr/cyberarkpas/cyberarkpas-1.2.3.zip',
    path: '/package/cyberarkpas/1.2.3',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/cyberarkpas/1.2.3/img/logo.svg',
        title: 'CyberArk logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'cyberarkpas',
        title: 'CyberArk Privileged Access Security audit logs',
        description: 'Collect logs from Vault instances',
      },
    ],
    id: 'cyberarkpas',
    status: 'not_installed',
  },
  {
    name: 'cylance',
    title: 'CylanceProtect',
    version: '0.3.0',
    release: 'experimental',
    description: 'CylanceProtect Integration',
    type: 'integration',
    download: '/epr/cylance/cylance-0.3.0.zip',
    path: '/package/cylance/0.3.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/cylance/0.3.0/img/logo.svg',
        title: 'CylanceProtect logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'protect',
        title: 'CylanceProtect',
        description: 'Collect CylanceProtect logs from syslog or a file.',
      },
    ],
    id: 'cylance',
    status: 'not_installed',
  },
  {
    name: 'elastic_agent',
    title: 'Elastic Agent',
    version: '1.0.0',
    release: 'ga',
    description: 'This Elastic integration collects metrics from Elastic Agent',
    type: 'integration',
    download: '/epr/elastic_agent/elastic_agent-1.0.0.zip',
    path: '/package/elastic_agent/1.0.0',
    icons: [
      {
        src: '/img/logo_elastic_agent.svg',
        path: '/package/elastic_agent/1.0.0/img/logo_elastic_agent.svg',
        title: 'logo Elastic Agent',
        size: '64x64',
        type: 'image/svg+xml',
      },
    ],
    id: 'elastic_agent',
    status: 'installed',
    savedObject: {
      type: 'epm-packages',
      id: 'elastic_agent',
      attributes: {
        installed_kibana: [
          {
            id: 'elastic_agent-f47f18cc-9c7d-4278-b2ea-a6dee816d395',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'elastic_agent-47d87552-8421-4cfc-bc5d-4a7205f5b007',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'elastic_agent-93a8a11d-b2da-4ef3-81dc-c7040560ffde',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'elastic_agent-a11c250a-865f-4eb2-9441-882d229313be',
            type: KibanaSavedObjectType.visualization,
          },
        ],
        installed_es: [
          {
            id: 'metrics-elastic_agent.elastic_agent',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-elastic_agent.elastic_agent@mappings',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-elastic_agent.elastic_agent@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
        ],
        package_assets: [
          {
            id: '0100ed87-1b21-5959-9ee3-6f6fe60b0126',
            type: 'epm-packages-assets',
          },
          {
            id: '79617489-e64c-5867-aa21-131d3f76d7c0',
            type: 'epm-packages-assets',
          },
          {
            id: 'c1da5c89-8489-5a28-b7d8-d71f3680193e',
            type: 'epm-packages-assets',
          },
          {
            id: 'e2ebdefd-4511-57c6-81bd-9b206d5de396',
            type: 'epm-packages-assets',
          },
          {
            id: 'aae8cab7-af27-5e71-9a95-a76e20ccfd0f',
            type: 'epm-packages-assets',
          },
          {
            id: '14935ecd-d51c-59c8-8c2b-fc0a3c94c3bc',
            type: 'epm-packages-assets',
          },
          {
            id: '0173d8b8-3625-5a87-9ff9-b6885d475e58',
            type: 'epm-packages-assets',
          },
          {
            id: '2c518c0e-44b7-5121-9cbe-b9794317fc65',
            type: 'epm-packages-assets',
          },
          {
            id: 'c5d0bc02-78bc-558f-a26e-406aeaeb0a6b',
            type: 'epm-packages-assets',
          },
          {
            id: '38e9b2ce-4833-594b-95e6-d4dc663ecd6a',
            type: 'epm-packages-assets',
          },
          {
            id: '12996859-f0e4-51f5-b842-a34781b11164',
            type: 'epm-packages-assets',
          },
          {
            id: '70b80a43-df71-5e8c-887d-c09114998a72',
            type: 'epm-packages-assets',
          },
          {
            id: 'bd50d62b-1f81-56ce-accf-82fe25f2723e',
            type: 'epm-packages-assets',
          },
        ],
        es_index_patterns: {
          elastic_agent: 'metrics-elastic_agent.elastic_agent-*',
        },
        name: 'elastic_agent',
        version: '1.0.0',
        internal: false,
        removable: false,
        install_version: '1.0.0',
        install_status: 'installed',
        install_started_at: '2021-08-25T19:44:41.090Z',
        install_source: 'registry',
        keep_policies_up_to_date: false,
      },
      references: [],
      coreMigrationVersion: '7.14.0',
      updated_at: '2021-08-25T19:45:01.491Z',
      version: 'Wzc3NjQsNF0=',
      // score: 0, TODO: this is not represented in any type, but is returned by the API,
    },
  },
  {
    name: 'endpoint',
    title: 'Endpoint Security',
    version: '1.0.0',
    release: 'ga',
    description:
      'Protect your hosts with threat prevention, detection, and deep security data visibility.',
    type: 'integration',
    download: '/epr/endpoint/endpoint-1.0.0.zip',
    path: '/package/endpoint/1.0.0',
    icons: [
      {
        src: '/img/security-logo-color-64px.svg',
        path: '/package/endpoint/1.0.0/img/security-logo-color-64px.svg',
        size: '16x16',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'endpoint',
        title: 'Endpoint Security Integration',
        description: 'Interact with the endpoint.',
      },
    ],
    id: 'endpoint',
    status: 'not_installed',
  },
  {
    name: 'f5',
    title: 'F5',
    version: '0.4.0',
    release: 'experimental',
    description: 'F5 Integration',
    type: 'integration',
    download: '/epr/f5/f5-0.4.0.zip',
    path: '/package/f5/0.4.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/f5/0.4.0/img/logo.svg',
        title: 'Big-IP Access Policy Manager logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'F5',
        title: 'F5 logs',
        description: 'Collect F5 logs from syslog or a file.',
      },
    ],
    id: 'f5',
    status: 'not_installed',
  },
  {
    name: 'fleet_server',
    title: 'Fleet Server',
    version: '1.0.1',
    release: 'ga',
    description: 'Centrally manage Elastic Agents with the Fleet Server integration',
    type: 'integration',
    download: '/epr/fleet_server/fleet_server-1.0.1.zip',
    path: '/package/fleet_server/1.0.1',
    icons: [
      {
        src: '/img/logo_fleet_server.svg',
        path: '/package/fleet_server/1.0.1/img/logo_fleet_server.svg',
        title: 'logo Fleet Server',
        size: '64x64',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'fleet_server',
        title: 'Fleet Server',
        description: 'Fleet Server setup',
      },
    ],
    id: 'fleet_server',
    status: 'installed',
    savedObject: {
      type: 'epm-packages',
      id: 'fleet_server',
      attributes: {
        installed_kibana: [],
        installed_es: [],
        package_assets: [
          {
            id: '4a805c49-0059-52f4-bdc0-56388a9708a7',
            type: 'epm-packages-assets',
          },
          {
            id: '738689f4-0777-5219-ac20-5517c593f6f6',
            type: 'epm-packages-assets',
          },
          {
            id: '1e5f0249-d9a4-5259-8905-e830165185da',
            type: 'epm-packages-assets',
          },
          {
            id: '67e878de-de6e-5123-ad62-caff2e59ef9b',
            type: 'epm-packages-assets',
          },
          {
            id: 'fa44229e-987c-58d5-bef9-95dbaedbe2d8',
            type: 'epm-packages-assets',
          },
        ],
        es_index_patterns: {},
        name: 'fleet_server',
        version: '1.0.1',
        internal: false,
        removable: false,
        install_version: '1.0.1',
        install_status: 'installed',
        install_started_at: '2021-08-25T19:44:37.078Z',
        install_source: 'registry',
        keep_policies_up_to_date: false,
      },
      references: [],
      coreMigrationVersion: '7.14.0',
      updated_at: '2021-08-25T19:44:53.517Z',
      version: 'WzczMTIsNF0=',
      // score: 0, TODO: this is not represented in any type, but is returned by the API,
    },
  },
  {
    name: 'fortinet',
    title: 'Fortinet',
    version: '1.1.2',
    release: 'ga',
    description: 'This Elastic integration collects logs from Fortinet instances',
    type: 'integration',
    download: '/epr/fortinet/fortinet-1.1.2.zip',
    path: '/package/fortinet/1.1.2',
    icons: [
      {
        src: '/img/fortinet-logo.svg',
        path: '/package/fortinet/1.1.2/img/fortinet-logo.svg',
        title: 'Fortinet',
        size: '216x216',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'fortinet',
        title: 'Fortinet logs',
        description: 'Collect logs from Fortinet instances',
      },
    ],
    id: 'fortinet',
    status: 'not_installed',
  },
  {
    name: 'gcp',
    title: 'Google Cloud Platform (GCP)',
    version: '0.2.0',
    release: 'experimental',
    description: 'Google Cloud Platform (GCP) Integration',
    type: 'integration',
    download: '/epr/gcp/gcp-0.2.0.zip',
    path: '/package/gcp/0.2.0',
    icons: [
      {
        src: '/img/logo_gcp.svg',
        path: '/package/gcp/0.2.0/img/logo_gcp.svg',
        title: 'logo gcp',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'gcp',
        title: 'Google Cloud Platform (GCP) logs',
        description: 'Collect logs from Google Cloud Platform (GCP) instances',
      },
    ],
    id: 'gcp',
    status: 'not_installed',
  },
  {
    name: 'google_workspace',
    title: 'Google Workspace',
    version: '0.7.3',
    release: 'experimental',
    description: 'This Elastic integration collects logs from Google Workspace APIs',
    type: 'integration',
    download: '/epr/google_workspace/google_workspace-0.7.3.zip',
    path: '/package/google_workspace/0.7.3',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/google_workspace/0.7.3/img/logo.svg',
        title: 'logo Google',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'google_workspace',
        title: 'Google Workspace logs',
        description: 'Collect logs from Google Workspace APIs',
      },
    ],
    id: 'google_workspace',
    status: 'not_installed',
  },
  {
    name: 'haproxy',
    title: 'HAProxy',
    version: '0.4.0',
    release: 'experimental',
    description: 'HAProxy Integration',
    type: 'integration',
    download: '/epr/haproxy/haproxy-0.4.0.zip',
    path: '/package/haproxy/0.4.0',
    icons: [
      {
        src: '/img/logo_haproxy.svg',
        path: '/package/haproxy/0.4.0/img/logo_haproxy.svg',
        title: 'logo HAProxy',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'haproxy',
        title: 'HAProxy logs and metrics',
        description: 'Collect logs and metrics from HAProxy instances',
      },
    ],
    id: 'haproxy',
    status: 'not_installed',
  },
  {
    name: 'iis',
    title: 'IIS',
    version: '0.5.0',
    release: 'beta',
    description: 'IIS Integration',
    type: 'integration',
    download: '/epr/iis/iis-0.5.0.zip',
    path: '/package/iis/0.5.0',
    icons: [
      {
        src: '/img/iis.svg',
        path: '/package/iis/0.5.0/img/iis.svg',
        title: 'iis',
        size: '100x100',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'iis',
        title: 'IIS logs and metrics',
        description: 'Collect logs and metrics from IIS instances',
      },
    ],
    id: 'iis',
    status: 'not_installed',
  },
  {
    name: 'imperva',
    title: 'Imperva SecureSphere',
    version: '0.3.0',
    release: 'experimental',
    description: 'Imperva SecureSphere Integration',
    type: 'integration',
    download: '/epr/imperva/imperva-0.3.0.zip',
    path: '/package/imperva/0.3.0',
    policy_templates: [
      {
        name: 'securesphere',
        title: 'Imperva SecureSphere',
        description: 'Collect Imperva SecureSphere logs from syslog or a file.',
      },
    ],
    id: 'imperva',
    status: 'not_installed',
  },
  {
    name: 'infoblox',
    title: 'Infoblox NIOS',
    version: '0.3.0',
    release: 'experimental',
    description: 'Infoblox NIOS Integration',
    type: 'integration',
    download: '/epr/infoblox/infoblox-0.3.0.zip',
    path: '/package/infoblox/0.3.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/infoblox/0.3.0/img/logo.svg',
        title: 'Infoblox NIOS logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'nios',
        title: 'Infoblox NIOS',
        description: 'Collect Infoblox NIOS logs from syslog or a file.',
      },
    ],
    id: 'infoblox',
    status: 'not_installed',
  },
  {
    name: 'iptables',
    title: 'Iptables',
    version: '0.5.0',
    release: 'experimental',
    description: 'This Elastic integration collects logs from Iptables instances',
    type: 'integration',
    download: '/epr/iptables/iptables-0.5.0.zip',
    path: '/package/iptables/0.5.0',
    icons: [
      {
        src: '/img/linux.svg',
        path: '/package/iptables/0.5.0/img/linux.svg',
        title: 'linux',
        size: '299x354',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'iptables',
        title: 'Iptables logs',
        description: 'Collect logs from iptables instances',
      },
    ],
    id: 'iptables',
    status: 'not_installed',
  },
  {
    name: 'juniper',
    title: 'Juniper',
    version: '0.7.0',
    release: 'experimental',
    description: 'Juniper Integration',
    type: 'integration',
    download: '/epr/juniper/juniper-0.7.0.zip',
    path: '/package/juniper/0.7.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/juniper/0.7.0/img/logo.svg',
        title: 'Juniper logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'juniper',
        title: 'Juniper logs',
        description: 'Collect Juniper logs from syslog or a file.',
      },
    ],
    id: 'juniper',
    status: 'not_installed',
  },
  {
    name: 'kafka',
    title: 'Kafka',
    version: '0.5.0',
    release: 'experimental',
    description: 'Kafka Integration',
    type: 'integration',
    download: '/epr/kafka/kafka-0.5.0.zip',
    path: '/package/kafka/0.5.0',
    icons: [
      {
        src: '/img/logo_kafka.svg',
        path: '/package/kafka/0.5.0/img/logo_kafka.svg',
        title: 'logo kafka',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'kafka',
        title: 'Kafka logs and metrics',
        description: 'Collect logs and metrics from Kafka brokers',
      },
    ],
    id: 'kafka',
    status: 'not_installed',
  },
  {
    name: 'kubernetes',
    title: 'Kubernetes',
    version: '0.8.0',
    release: 'experimental',
    description: 'Kubernetes Integration',
    type: 'integration',
    download: '/epr/kubernetes/kubernetes-0.8.0.zip',
    path: '/package/kubernetes/0.8.0',
    icons: [
      {
        src: '/img/logo_kubernetes.svg',
        path: '/package/kubernetes/0.8.0/img/logo_kubernetes.svg',
        title: 'Logo Kubernetes',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'kubelet',
        title: 'Kubelet',
        description: 'Collect metrics from Kubernetes Kubelet API',
        icons: [
          {
            src: '/img/logo_kubernetes.svg',
            path: '/package/kubernetes/0.8.0/img/logo_kubernetes.svg',
            title: 'Logo Kubernetes',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'kube-state-metrics',
        title: 'kube-state-metrics',
        description: 'Collect metrics from kube-state-metrics',
        icons: [
          {
            src: '/img/logo_kubernetes.svg',
            path: '/package/kubernetes/0.8.0/img/logo_kubernetes.svg',
            title: 'Logo Kubernetes',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'kube-apiserver',
        title: 'kube-apiserver',
        description: 'Collect metrics from Kubernetes API Server',
        icons: [
          {
            src: '/img/logo_kubernetes.svg',
            path: '/package/kubernetes/0.8.0/img/logo_kubernetes.svg',
            title: 'Logo Kubernetes',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'kube-proxy',
        title: 'kube-proxy',
        description: 'Collect metrics from Kubernetes Proxy',
        icons: [
          {
            src: '/img/logo_kubernetes.svg',
            path: '/package/kubernetes/0.8.0/img/logo_kubernetes.svg',
            title: 'Logo Kubernetes',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'kube-scheduler',
        title: 'kube-scheduler',
        description: 'Collect metrics from Kubernetes Scheduler',
        icons: [
          {
            src: '/img/logo_kubernetes.svg',
            path: '/package/kubernetes/0.8.0/img/logo_kubernetes.svg',
            title: 'Logo Kubernetes',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'kube-controller-manager',
        title: 'kube-controller-manager',
        description: 'Collect metrics from Kubernetes controller-manager',
        icons: [
          {
            src: '/img/logo_kubernetes.svg',
            path: '/package/kubernetes/0.8.0/img/logo_kubernetes.svg',
            title: 'Logo Kubernetes',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'events',
        title: 'Events',
        description: 'Collect events from Kubernetes API server',
        icons: [
          {
            src: '/img/logo_kubernetes.svg',
            path: '/package/kubernetes/0.8.0/img/logo_kubernetes.svg',
            title: 'Logo Kubernetes',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
      },
    ],
    id: 'kubernetes',
    status: 'not_installed',
  },
  {
    name: 'linux',
    title: 'Linux',
    version: '0.4.1',
    release: 'beta',
    description: 'Linux Integration',
    type: 'integration',
    download: '/epr/linux/linux-0.4.1.zip',
    path: '/package/linux/0.4.1',
    policy_templates: [
      {
        name: 'system',
        title: 'Linux kernel metrics',
        description: 'Collect system metrics from Linux operating systems',
      },
    ],
    id: 'linux',
    status: 'not_installed',
  },
  {
    name: 'log',
    title: 'Custom logs',
    version: '0.4.6',
    release: 'experimental',
    description: 'Collect your custom logs.\n',
    type: 'integration',
    download: '/epr/log/log-0.4.6.zip',
    path: '/package/log/0.4.6',
    icons: [
      {
        src: '/img/icon.svg',
        path: '/package/log/0.4.6/img/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'logs',
        title: 'Custom logs',
        description: 'Collect your custom log files.',
      },
    ],
    id: 'log',
    status: 'not_installed',
  },
  {
    name: 'microsoft',
    title: 'Microsoft',
    version: '0.6.0',
    release: 'experimental',
    description: 'Microsoft Integration',
    type: 'integration',
    download: '/epr/microsoft/microsoft-0.6.0.zip',
    path: '/package/microsoft/0.6.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/microsoft/0.6.0/img/logo.svg',
        title: 'Microsoft logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'microsoft',
        title: 'Microsoft',
        description: 'Collect logs from Microsoft products',
      },
    ],
    id: 'microsoft',
    status: 'not_installed',
  },
  {
    name: 'mongodb',
    title: 'MongoDB',
    version: '0.6.0',
    release: 'experimental',
    description: 'MongoDB Integration',
    type: 'integration',
    download: '/epr/mongodb/mongodb-0.6.0.zip',
    path: '/package/mongodb/0.6.0',
    icons: [
      {
        src: '/img/logo_mongodb.svg',
        path: '/package/mongodb/0.6.0/img/logo_mongodb.svg',
        title: 'logo mongodb',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'mongodb',
        title: 'MongoDB logs and metrics',
        description: 'Collect logs and metrics from MongoDB instances',
      },
    ],
    id: 'mongodb',
    status: 'not_installed',
  },
  {
    name: 'mysql',
    title: 'MySQL',
    version: '0.5.0',
    release: 'beta',
    description: 'MySQL Integration',
    type: 'integration',
    download: '/epr/mysql/mysql-0.5.0.zip',
    path: '/package/mysql/0.5.0',
    icons: [
      {
        src: '/img/logo_mysql.svg',
        path: '/package/mysql/0.5.0/img/logo_mysql.svg',
        title: 'logo mysql',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'mysql',
        title: 'MySQL logs and metrics',
        description: 'Collect logs and metrics from MySQL instances',
      },
    ],
    id: 'mysql',
    status: 'not_installed',
  },
  {
    name: 'nats',
    title: 'NATS',
    version: '0.4.0',
    release: 'experimental',
    description: 'NATS Integration',
    type: 'integration',
    download: '/epr/nats/nats-0.4.0.zip',
    path: '/package/nats/0.4.0',
    icons: [
      {
        src: '/img/nats.svg',
        path: '/package/nats/0.4.0/img/nats.svg',
        title: 'NATS Logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'nats',
        title: 'NATS Logs and Metrics',
        description: 'Collect logs and metrics from NATS instances',
      },
    ],
    id: 'nats',
    status: 'not_installed',
  },
  {
    name: 'netflow',
    title: 'NetFlow',
    version: '1.2.0',
    release: 'ga',
    description: 'This Elastic integration collects logs from NetFlow',
    type: 'integration',
    download: '/epr/netflow/netflow-1.2.0.zip',
    path: '/package/netflow/1.2.0',
    policy_templates: [
      {
        name: 'netflow',
        title: 'NetFlow logs',
        description: 'Collect Netflow logs from networks via UDP',
      },
    ],
    id: 'netflow',
    status: 'not_installed',
  },
  {
    name: 'netscout',
    title: 'Arbor Peakflow SP',
    version: '0.3.0',
    release: 'experimental',
    description: 'Arbor Peakflow SP Integration',
    type: 'integration',
    download: '/epr/netscout/netscout-0.3.0.zip',
    path: '/package/netscout/0.3.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/netscout/0.3.0/img/logo.svg',
        title: 'Arbor Peakflow SP logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'sightline',
        title: 'Arbor Peakflow SP',
        description: 'Collect Arbor Peakflow SP logs from syslog or a file.',
      },
    ],
    id: 'netscout',
    status: 'not_installed',
  },
  {
    name: 'nginx',
    title: 'Nginx',
    version: '0.7.0',
    release: 'experimental',
    description: 'Nginx Integration',
    type: 'integration',
    download: '/epr/nginx/nginx-0.7.0.zip',
    path: '/package/nginx/0.7.0',
    icons: [
      {
        src: '/img/logo_nginx.svg',
        path: '/package/nginx/0.7.0/img/logo_nginx.svg',
        title: 'logo nginx',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'nginx',
        title: 'Nginx logs and metrics',
        description: 'Collect logs and metrics from Nginx instances',
      },
    ],
    id: 'nginx',
    status: 'not_installed',
  },
  {
    name: 'nginx_ingress_controller',
    title: 'Nginx Ingress Controller',
    version: '0.2.0',
    release: 'experimental',
    description: 'Nginx Ingress Controller Integration',
    type: 'integration',
    download: '/epr/nginx_ingress_controller/nginx_ingress_controller-0.2.0.zip',
    path: '/package/nginx_ingress_controller/0.2.0',
    icons: [
      {
        src: '/img/logo_nginx.svg',
        path: '/package/nginx_ingress_controller/0.2.0/img/logo_nginx.svg',
        title: 'Nginx logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'nginx_ingress_controller',
        title: 'Nginx Ingress Controller logs',
        description: 'Collect logs from Nginx Ingress Controller instances',
      },
    ],
    id: 'nginx_ingress_controller',
    status: 'not_installed',
  },
  {
    name: 'o365',
    title: 'Office 365',
    version: '1.1.4',
    release: 'ga',
    description: 'This Elastic integration collects events from Microsoft Office 365',
    type: 'integration',
    download: '/epr/o365/o365-1.1.4.zip',
    path: '/package/o365/1.1.4',
    icons: [
      {
        src: '/img/logo-integrations-microsoft-365.svg',
        path: '/package/o365/1.1.4/img/logo-integrations-microsoft-365.svg',
        title: 'Microsoft Office 365',
        size: '216x216',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'o365',
        title: 'Office 365 logs',
        description: 'Collect logs from Office 365',
      },
    ],
    id: 'o365',
    status: 'not_installed',
  },
  {
    name: 'okta',
    title: 'Okta',
    version: '1.2.0',
    release: 'ga',
    description: 'This Elastic integration collects events from Okta',
    type: 'integration',
    download: '/epr/okta/okta-1.2.0.zip',
    path: '/package/okta/1.2.0',
    icons: [
      {
        src: '/img/okta-logo.svg',
        path: '/package/okta/1.2.0/img/okta-logo.svg',
        title: 'Okta',
        size: '216x216',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'okta',
        title: 'Okta logs',
        description: 'Collect logs from Okta',
      },
    ],
    id: 'okta',
    status: 'not_installed',
  },
  {
    name: 'osquery',
    title: 'Osquery Log Collection',
    version: '0.6.0',
    release: 'experimental',
    description: 'This Elastic integration collects logs from Osquery instances',
    type: 'integration',
    download: '/epr/osquery/osquery-0.6.0.zip',
    path: '/package/osquery/0.6.0',
    icons: [
      {
        src: '/img/logo_osquery.svg',
        path: '/package/osquery/0.6.0/img/logo_osquery.svg',
        title: 'logo osquery',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'osquery',
        title: 'Osquery logs',
        description: 'Collect logs from Osquery instances',
      },
    ],
    id: 'osquery',
    status: 'not_installed',
  },
  {
    name: 'osquery_manager',
    title: 'Osquery Manager',
    version: '0.3.2',
    release: 'beta',
    description:
      'Centrally manage osquery deployments, run live queries, and schedule recurring queries',
    type: 'integration',
    download: '/epr/osquery_manager/osquery_manager-0.3.2.zip',
    path: '/package/osquery_manager/0.3.2',
    icons: [
      {
        src: '/img/logo_osquery.svg',
        path: '/package/osquery_manager/0.3.2/img/logo_osquery.svg',
        title: 'logo osquery',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'osquery_manager',
        title: 'Osquery Manager',
        description:
          'Send interactive or scheduled queries to the osquery instances executed by the elastic-agent.',
      },
    ],
    id: 'osquery_manager',
    status: 'not_installed',
  },
  {
    name: 'panw',
    title: 'Palo Alto Networks',
    version: '1.1.3',
    release: 'ga',
    description: 'Palo Alto Networks Integration',
    type: 'integration',
    download: '/epr/panw/panw-1.1.3.zip',
    path: '/package/panw/1.1.3',
    icons: [
      {
        src: '/img/logo-integrations-paloalto-networks.svg',
        path: '/package/panw/1.1.3/img/logo-integrations-paloalto-networks.svg',
        title: 'Palo Alto Networks',
        size: '216x216',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'panw',
        title: 'Palo Alto Networks PAN-OS firewall logs',
        description: 'Collect logs from Palo Alto Networks PAN-OS firewall',
      },
    ],
    id: 'panw',
    status: 'not_installed',
  },
  {
    name: 'postgresql',
    title: 'PostgreSQL',
    version: '0.5.0',
    release: 'experimental',
    description: 'PostgreSQL Integration',
    type: 'integration',
    download: '/epr/postgresql/postgresql-0.5.0.zip',
    path: '/package/postgresql/0.5.0',
    icons: [
      {
        src: '/img/logo_postgres.svg',
        path: '/package/postgresql/0.5.0/img/logo_postgres.svg',
        title: 'logo postgres',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'postgresql',
        title: 'PostgreSQL logs and metrics',
        description: 'Collect logs and metrics from PostgreSQL instances',
      },
    ],
    id: 'postgresql',
    status: 'not_installed',
  },
  {
    name: 'prometheus',
    title: 'Prometheus',
    version: '0.4.1',
    release: 'experimental',
    description: 'Prometheus Integration',
    type: 'integration',
    download: '/epr/prometheus/prometheus-0.4.1.zip',
    path: '/package/prometheus/0.4.1',
    icons: [
      {
        src: '/img/logo_prometheus.svg',
        path: '/package/prometheus/0.4.1/img/logo_prometheus.svg',
        title: 'logo prometheus',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'prometheus',
        title: 'Prometheus metrics',
        description: 'Collect metrics from Prometheus instances',
      },
    ],
    id: 'prometheus',
    status: 'not_installed',
  },
  {
    name: 'proofpoint',
    title: 'Proofpoint Email Security',
    version: '0.2.0',
    release: 'experimental',
    description: 'Proofpoint Email Security Integration',
    type: 'integration',
    download: '/epr/proofpoint/proofpoint-0.2.0.zip',
    path: '/package/proofpoint/0.2.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/proofpoint/0.2.0/img/logo.svg',
        title: 'Proofpoint Email Security logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'proofpoint',
        title: 'Proofpoint logs',
        description: 'Collect Proofpoint logs from syslog or a file.',
      },
    ],
    id: 'proofpoint',
    status: 'not_installed',
  },
  {
    name: 'rabbitmq',
    title: 'RabbitMQ',
    version: '0.4.1',
    release: 'experimental',
    description: 'RabbitMQ Integration',
    type: 'integration',
    download: '/epr/rabbitmq/rabbitmq-0.4.1.zip',
    path: '/package/rabbitmq/0.4.1',
    icons: [
      {
        src: '/img/logo_rabbitmq.svg',
        path: '/package/rabbitmq/0.4.1/img/logo_rabbitmq.svg',
        title: 'RabbitMQ Logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'rabbitmq',
        title: 'RabbitMQ logs and metrics',
        description: 'Collect logs and metrics from RabbitMQ instances',
      },
    ],
    id: 'rabbitmq',
    status: 'not_installed',
  },
  {
    name: 'radware',
    title: 'Radware DefensePro',
    version: '0.4.0',
    release: 'experimental',
    description: 'This Elastic integration collects logs from Radware DefensePro',
    type: 'integration',
    download: '/epr/radware/radware-0.4.0.zip',
    path: '/package/radware/0.4.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/radware/0.4.0/img/logo.svg',
        title: 'Radware DefensePro logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'defensepro',
        title: 'Radware DefensePro',
        description: 'Collect Radware DefensePro logs from syslog or a file.',
      },
    ],
    id: 'radware',
    status: 'not_installed',
  },
  {
    name: 'redis',
    title: 'Redis',
    version: '0.5.0',
    release: 'experimental',
    description: 'Redis Integration',
    type: 'integration',
    download: '/epr/redis/redis-0.5.0.zip',
    path: '/package/redis/0.5.0',
    icons: [
      {
        src: '/img/logo_redis.svg',
        path: '/package/redis/0.5.0/img/logo_redis.svg',
        title: 'logo redis',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'redis',
        title: 'Redis logs and metrics',
        description: 'Collect logs and metrics from Redis instances',
      },
    ],
    id: 'redis',
    status: 'not_installed',
  },
  {
    name: 'santa',
    title: 'Google Santa',
    version: '0.4.0',
    release: 'experimental',
    description: 'This Elastic integration collects logs from Google Santa instances',
    type: 'integration',
    download: '/epr/santa/santa-0.4.0.zip',
    path: '/package/santa/0.4.0',
    icons: [
      {
        src: '/img/icon.svg',
        path: '/package/santa/0.4.0/img/icon.svg',
        title: 'Google Santa',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'santa',
        title: 'Google Santa logs',
        description: 'Collect logs from Google Santa instances',
      },
    ],
    id: 'santa',
    status: 'not_installed',
  },
  {
    name: 'security_detection_engine',
    title: 'Prebuilt Security Detection Rules',
    version: '0.14.1',
    release: 'ga',
    description: 'Prebuilt detection rules for Elastic Security',
    type: 'integration',
    download: '/epr/security_detection_engine/security_detection_engine-0.14.1.zip',
    path: '/package/security_detection_engine/0.14.1',
    icons: [
      {
        src: '/img/security-logo-color-64px.svg',
        path: '/package/security_detection_engine/0.14.1/img/security-logo-color-64px.svg',
        size: '16x16',
        type: 'image/svg+xml',
      },
    ],
    id: 'security_detection_engine',
    status: 'not_installed',
  },
  {
    name: 'sonicwall',
    title: 'Sonicwall-FW',
    version: '0.3.0',
    release: 'experimental',
    description: 'Sonicwall-FW Integration',
    type: 'integration',
    download: '/epr/sonicwall/sonicwall-0.3.0.zip',
    path: '/package/sonicwall/0.3.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/sonicwall/0.3.0/img/logo.svg',
        title: 'Sonicwall-FW logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'firewall',
        title: 'Sonicwall-FW',
        description: 'Collect Sonicwall-FW logs from syslog or a file.',
      },
    ],
    id: 'sonicwall',
    status: 'not_installed',
  },
  {
    name: 'sophos',
    title: 'Sophos',
    version: '0.4.0',
    release: 'experimental',
    description: 'Sophos Integration',
    type: 'integration',
    download: '/epr/sophos/sophos-0.4.0.zip',
    path: '/package/sophos/0.4.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/sophos/0.4.0/img/logo.svg',
        title: 'Sophos logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'sophos',
        title: 'Sophos logs',
        description: 'Collect Sophos logs from syslog or a file.',
      },
    ],
    id: 'sophos',
    status: 'not_installed',
  },
  {
    name: 'squid',
    title: 'Squid',
    version: '0.3.0',
    release: 'experimental',
    description: 'Squid Integration',
    type: 'integration',
    download: '/epr/squid/squid-0.3.0.zip',
    path: '/package/squid/0.3.0',
    policy_templates: [
      {
        name: 'log',
        title: 'Squid',
        description: 'Collect Squid logs from syslog or a file.',
      },
    ],
    id: 'squid',
    status: 'not_installed',
  },
  {
    name: 'stan',
    title: 'STAN',
    version: '0.2.0',
    release: 'beta',
    description: 'NATS Streaming Integration',
    type: 'integration',
    download: '/epr/stan/stan-0.2.0.zip',
    path: '/package/stan/0.2.0',
    icons: [
      {
        src: '/img/stan.svg',
        path: '/package/stan/0.2.0/img/stan.svg',
        title: 'STAN Logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'stan',
        title: 'STAN Logs and Metrics',
        description: 'Collect logs and metrics from STAN instances',
      },
    ],
    id: 'stan',
    status: 'not_installed',
  },
  {
    name: 'suricata',
    title: 'Suricata',
    version: '1.2.0',
    release: 'ga',
    description: 'This Elastic integration collects events from Suricata instances',
    type: 'integration',
    download: '/epr/suricata/suricata-1.2.0.zip',
    path: '/package/suricata/1.2.0',
    icons: [
      {
        src: '/img/suricata.svg',
        path: '/package/suricata/1.2.0/img/suricata.svg',
        title: 'suricata',
        size: '309x309',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'suricata',
        title: 'Suricata logs',
        description: 'Collect logs from Suricata instances',
      },
    ],
    id: 'suricata',
    status: 'not_installed',
  },
  {
    name: 'symantec',
    title: 'Symantec AntiVirus/Endpoint Protection',
    version: '0.1.2',
    release: 'experimental',
    description: 'Symantec AntiVirus/Endpoint Protection Integration',
    type: 'integration',
    download: '/epr/symantec/symantec-0.1.2.zip',
    path: '/package/symantec/0.1.2',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/symantec/0.1.2/img/logo.svg',
        title: 'Symantec AntiVirus/Endpoint Protection logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'symantec',
        title: 'Symantec AntiVirus/Endpoint Protection logs',
        description: 'Collect Symantec AntiVirus/Endpoint Protection logs from syslog or a file.',
      },
    ],
    id: 'symantec',
    status: 'not_installed',
  },
  {
    name: 'synthetics',
    title: 'Elastic Synthetics',
    version: '0.3.0',
    release: 'beta',
    description: 'This Elastic integration allows you to monitor the availability of your services',
    type: 'integration',
    download: '/epr/synthetics/synthetics-0.3.0.zip',
    path: '/package/synthetics/0.3.0',
    icons: [
      {
        src: '/img/uptime-logo-color-64px.svg',
        path: '/package/synthetics/0.3.0/img/uptime-logo-color-64px.svg',
        size: '16x16',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'synthetics',
        title: 'Elastic Synthetics',
        description: 'Perform synthetic health checks on network endpoints.',
      },
    ],
    id: 'synthetics',
    status: 'not_installed',
  },
  {
    name: 'system',
    title: 'System',
    version: '1.1.2',
    release: 'ga',
    description: 'This Elastic integration collects logs and metrics from your servers',
    type: 'integration',
    download: '/epr/system/system-1.1.2.zip',
    path: '/package/system/1.1.2',
    icons: [
      {
        src: '/img/system.svg',
        path: '/package/system/1.1.2/img/system.svg',
        title: 'system',
        size: '1000x1000',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'system',
        title: 'System logs and metrics',
        description: 'Collect logs and metrics from System instances',
      },
    ],
    id: 'system',
    status: 'installed',
    savedObject: {
      type: 'epm-packages',
      id: 'system',
      attributes: {
        installed_kibana: [
          {
            id: 'system-01c54730-fee6-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-035846a0-a249-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-0d3f2380-fa78-11e6-ae9b-81e5311e8cab',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-277876d0-fa2c-11e6-bbd3-29c986c96e5a',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-5517a150-f9ce-11e6-8115-a7c18106d86a',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-71f720f0-ff18-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-79ffd6e0-faa0-11e6-947f-177f697178b8',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-8223bed0-b9e9-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-Logs-syslog-dashboard',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-Metrics-system-overview',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-Winlogbeat-dashboard',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-bae11b00-9bfc-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-bb858830-f412-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-d401ef40-a7d5-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-f49f3170-9ffc-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.dashboard,
          },
          {
            id: 'system-006d75f0-9c03-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-0620c3d0-bcd4-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-0622da40-9bfd-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-089b85d0-1b16-11e7-b09e-037021c4f8df',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-0cb2d940-bcde-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-0f2f5280-feeb-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-102efd20-bcdd-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-117f5a30-9b71-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-12667040-fa80-11e6-a1df-a78bd7504d38',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-162d7ab0-a7d6-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-175a5760-a7d5-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-18348f30-a24d-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-19e123b0-4d5a-11e7-aee5-fdc812cc3bec',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-1aae9140-1b93-11e7-8ada-3df93aab833e',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-1b5f17d0-feea-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-1b6725f0-ff1d-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-1f271bc0-231a-11ea-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-2084e300-a884-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-21aadac0-9c0b-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-25f31ee0-9c23-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-26732e20-1b91-11e7-bec4-a5e9ec5cab8b',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-26877510-9b72-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-2c71e0f0-9c0d-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-2dc6b820-b9e8-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-2e224660-1b19-11e7-b09e-037021c4f8df',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-327417e0-8462-11e7-bab8-bd2f0fb42c54',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-33462600-9b47-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-341ffe70-f9ce-11e6-8115-a7c18106d86a',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-346bb290-fa80-11e6-a1df-a78bd7504d38',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-34f97ee0-1b96-11e7-8ada-3df93aab833e',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-3cec3eb0-f9d3-11e6-8a3e-2b904044ea1d',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-3d65d450-a9c3-11e7-af20-67db8aecb295',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-400b63e0-f49a-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-421f0610-af98-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-4ac8f5f0-bcfe-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-4b683ac0-a7d7-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-4bedf650-9ffd-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-4d546850-1b15-11e7-b09e-037021c4f8df',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-4e4bb1e0-1b1b-11e7-b09e-037021c4f8df',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-51164310-fa2b-11e6-bbd3-29c986c96e5a',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-522ee670-1b92-11e7-bec4-a5e9ec5cab8b',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-546febc0-f49b-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-568a8130-bcde-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-58fb9480-9b46-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-590a60f0-5d87-11e7-8884-1bb4c3b890e4',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-5bb93ed0-a249-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-5c7af030-fa2a-11e6-bbd3-29c986c96e5a',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-5c9ee410-9b74-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-5d117970-9ffd-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-5d92b100-bce8-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-5dd15c00-fa78-11e6-ae9b-81e5311e8cab',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-5e19ff80-231c-11ea-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-5e7f0ed0-bcd2-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-5eeaafd0-fee7-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-60301890-ff1d-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-6b7b9a40-faa1-11e6-86b1-cd7735ff7e23',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-6f0f2ea0-f414-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-729443b0-a7d6-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-7322f9f0-ff1c-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-78b74f30-f9cd-11e6-8115-a7c18106d86a',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-7a329a00-a7d5-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-7cdb1330-4d1a-11e7-a196-69b9a7a020a9',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-7de2e3f0-9b4d-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-804dd400-a248-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-825fdb80-4d1d-11e7-b5f2-2b7c1895bf32',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-83e12df0-1b91-11e7-bec4-a5e9ec5cab8b',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-84502430-bce8-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-855899e0-1b1c-11e7-b09e-037021c4f8df',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-855957d0-bcdd-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-860706a0-9bfd-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-8ef59f90-6ab8-11ea-896f-0d70f7ec3956',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-8f20c950-bcd4-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-96976150-4d5d-11e7-aa29-87a97a796de6',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-97c70300-ff1c-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-98884120-f49d-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-99381c80-4d60-11e7-9a4c-ed99bbcaa42b',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-9dd22440-ff1d-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-9e534190-f49d-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-Event-Levels',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-Navigation',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-Number-of-Events-Over-Time-By-Event-Log',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-Number-of-Events',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-Sources',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-Syslog-events-by-hostname',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-Syslog-hostnames-and-processes',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-Top-Event-IDs',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-a13bf640-fee8-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-a3c3f350-9b6d-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-a5f664c0-f49a-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-a79395f0-6aba-11ea-896f-0d70f7ec3956',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-a909b930-685f-11ea-896f-0d70f7ec3956',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-aa31c9d0-9b75-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-ab2d1e90-1b1a-11e7-b09e-037021c4f8df',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-ab6f8d80-bce8-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-abd44840-9c0f-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-abf96c10-bcea-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-b5f38780-fee6-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-b89b0c90-9b41-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-bb9cf7a0-f49d-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-bc165210-f4b8-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-bf45dc50-ff1a-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-bfa5e400-1b16-11e7-b09e-037021c4f8df',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-c2ea73f0-a4bd-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-c359b020-bcdd-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-c5e3cf90-4d60-11e7-9a4c-ed99bbcaa42b',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-c6f2ffd0-4d17-11e7-a196-69b9a7a020a9',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-c9d959f0-ff1d-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-caf4d2b0-9b76-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-ce867840-f49e-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-d16bb400-f9cc-11e6-8115-a7c18106d86a',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-d2e80340-4d5c-11e7-aa29-87a97a796de6',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-d3166e80-1b91-11e7-bec4-a5e9ec5cab8b',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-d3a5fec0-ff18-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-d56ee420-fa79-11e6-a1df-a78bd7504d38',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-d770b040-9b35-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-da2110c0-bcea-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-da5ffe40-bcd9-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-dc589770-fa2b-11e6-bbd3-29c986c96e5a',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-e0f001c0-1b18-11e7-b09e-037021c4f8df',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-e121b140-fa78-11e6-a1df-a78bd7504d38',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-e20c02d0-9b48-11ea-87e4-49f31ec44891',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-e22c6f40-f498-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-e2516c10-a249-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-ee0319a0-bcd4-11e9-b6a2-c9b4015c4baf',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-ee292bc0-f499-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-f398d2f0-fa77-11e6-ae9b-81e5311e8cab',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-f42f3b20-fee6-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-fa876300-231a-11ea-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-fe064790-1b1f-11e7-bec4-a5e9ec5cab8b',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-fee83900-f49f-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-ffebe440-f419-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.visualization,
          },
          {
            id: 'system-06b6b060-7a80-11ea-bc9a-0baf2ca323a3',
            type: KibanaSavedObjectType.search,
          },
          {
            id: 'system-324686c0-fefb-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.search,
          },
          {
            id: 'system-62439dc0-f9c9-11e6-a747-6121780e0414',
            type: KibanaSavedObjectType.search,
          },
          {
            id: 'system-6f4071a0-7a78-11ea-bc9a-0baf2ca323a3',
            type: KibanaSavedObjectType.search,
          },
          {
            id: 'system-757510b0-a87f-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.search,
          },
          {
            id: 'system-7e178c80-fee1-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.search,
          },
          {
            id: 'system-8030c1b0-fa77-11e6-ae9b-81e5311e8cab',
            type: KibanaSavedObjectType.search,
          },
          {
            id: 'system-9066d5b0-fef2-11e9-8405-516218e3d268',
            type: KibanaSavedObjectType.search,
          },
          {
            id: 'system-Syslog-system-logs',
            type: KibanaSavedObjectType.search,
          },
          {
            id: 'system-b6f321e0-fa25-11e6-bbd3-29c986c96e5a',
            type: KibanaSavedObjectType.search,
          },
          {
            id: 'system-ce71c9a0-a25e-11e9-a422-d144027429da',
            type: KibanaSavedObjectType.search,
          },
          {
            id: 'system-eb0039f0-fa7f-11e6-a1df-a78bd7504d38',
            type: KibanaSavedObjectType.search,
          },
        ],
        installed_es: [
          {
            id: 'logs-system.application-1.1.2',
            type: ElasticsearchAssetType.ingestPipeline,
          },
          {
            id: 'logs-system.auth-1.1.2',
            type: ElasticsearchAssetType.ingestPipeline,
          },
          {
            id: 'logs-system.security-1.1.2',
            type: ElasticsearchAssetType.ingestPipeline,
          },
          {
            id: 'logs-system.syslog-1.1.2',
            type: ElasticsearchAssetType.ingestPipeline,
          },
          {
            id: 'logs-system.system-1.1.2',
            type: ElasticsearchAssetType.ingestPipeline,
          },
          {
            id: 'logs-system.application',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'logs-system.application@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'logs-system.auth',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'logs-system.auth@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-system.core',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-system.core@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-system.cpu',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-system.cpu@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-system.diskio',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-system.diskio@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-system.filesystem',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-system.filesystem@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-system.fsstat',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-system.fsstat@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-system.load',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-system.load@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-system.memory',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-system.memory@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-system.network',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-system.network@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-system.process',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-system.process@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-system.process.summary',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-system.process.summary@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'logs-system.security',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'logs-system.security@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-system.socket_summary',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-system.socket_summary@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'logs-system.syslog',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'logs-system.syslog@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'logs-system.system',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'logs-system.system@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
          {
            id: 'metrics-system.uptime',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: 'metrics-system.uptime@custom',
            type: ElasticsearchAssetType.componentTemplate,
          },
        ],
        package_assets: [
          {
            id: '24d5bf0e-9d18-5d4c-aab5-e9df683e6c33',
            type: 'epm-packages-assets',
          },
          {
            id: '033fb05a-aacc-5c41-8119-13d52078cf32',
            type: 'epm-packages-assets',
          },
          {
            id: '0b9501d6-2870-5324-b9cf-94ff8cb15e7b',
            type: 'epm-packages-assets',
          },
          {
            id: '88adfac5-87a3-59dd-82f3-be0b4f05c79c',
            type: 'epm-packages-assets',
          },
          {
            id: '91812a40-865b-532c-85bb-c129f0e5470b',
            type: 'epm-packages-assets',
          },
          {
            id: 'bbdae0f8-fbc2-506f-9749-e490ee259cac',
            type: 'epm-packages-assets',
          },
          {
            id: 'a477e3dd-34ff-584e-a5a7-c1c4c2f0cd50',
            type: 'epm-packages-assets',
          },
          {
            id: '9d8784ac-73e3-53d4-8cee-4f89f0ad8510',
            type: 'epm-packages-assets',
          },
          {
            id: 'd4fb583d-0f95-598c-8583-59fc833fad36',
            type: 'epm-packages-assets',
          },
          {
            id: '2503b12c-045c-55a4-9091-c9ec8782248a',
            type: 'epm-packages-assets',
          },
          {
            id: '559fb8fe-6f73-5c7a-ad8d-cd6baba9fd84',
            type: 'epm-packages-assets',
          },
          {
            id: 'cd1d1a1a-f595-5b7f-a416-2f54db379e8e',
            type: 'epm-packages-assets',
          },
          {
            id: '997dc457-7d6e-53c6-b35d-82e6095ac2e5',
            type: 'epm-packages-assets',
          },
          {
            id: '34a2d52c-5041-5c1b-86f7-6edc3384afe9',
            type: 'epm-packages-assets',
          },
          {
            id: '95a53c9e-0a7c-5bb5-9b5c-a2dba086c014',
            type: 'epm-packages-assets',
          },
          {
            id: '1d2390ea-960b-5bd8-ac7c-eb139e57081e',
            type: 'epm-packages-assets',
          },
          {
            id: 'd04ed332-2098-53e5-8b0b-974f4cb8034a',
            type: 'epm-packages-assets',
          },
          {
            id: '568fdd73-d459-5477-9428-e181f7ccf72b',
            type: 'epm-packages-assets',
          },
          {
            id: '97f78283-b529-5993-a841-e8a00eb7da85',
            type: 'epm-packages-assets',
          },
          {
            id: '72db591c-96ed-58ea-a9d7-ee06a2b674d6',
            type: 'epm-packages-assets',
          },
          {
            id: '4102bc21-6624-5a43-90d7-748f0daa6d32',
            type: 'epm-packages-assets',
          },
          {
            id: 'b42ab304-eff7-5996-801f-40bf5577f260',
            type: 'epm-packages-assets',
          },
          {
            id: '32311c4b-847a-5bf0-b24c-1b77ef6e9325',
            type: 'epm-packages-assets',
          },
          {
            id: '6720333f-5f42-58b0-9661-044119397ec1',
            type: 'epm-packages-assets',
          },
          {
            id: 'a021b06f-138b-5927-9abe-3a85d29e6a9a',
            type: 'epm-packages-assets',
          },
          {
            id: '8f2e20d2-dd8f-52f5-b30f-52ef101b32fc',
            type: 'epm-packages-assets',
          },
          {
            id: 'ecd6a951-5656-5c34-b682-b9db70c0502d',
            type: 'epm-packages-assets',
          },
          {
            id: 'ab696da3-6e5b-5da8-b0cd-4d80e95129fd',
            type: 'epm-packages-assets',
          },
          {
            id: 'ddb89b63-b237-58f3-ba8e-ac7dc7d13bce',
            type: 'epm-packages-assets',
          },
          {
            id: 'a45e7e27-141a-5096-8114-bb0b2bae6754',
            type: 'epm-packages-assets',
          },
          {
            id: '4ccce089-3138-54d5-9767-a9434be05289',
            type: 'epm-packages-assets',
          },
          {
            id: 'c5fba17b-85d2-578d-9814-80cb70ad6460',
            type: 'epm-packages-assets',
          },
          {
            id: '8eaba418-f01b-5607-a289-6100b6cda900',
            type: 'epm-packages-assets',
          },
          {
            id: '69d3b6ab-8c55-5eff-bfec-a1d5638d113b',
            type: 'epm-packages-assets',
          },
          {
            id: 'e974ece1-e21d-5ac8-91a2-1d98e6390777',
            type: 'epm-packages-assets',
          },
          {
            id: '1babb631-2aea-5849-ae09-f6438b68694d',
            type: 'epm-packages-assets',
          },
          {
            id: 'ad6ec580-9a98-5f16-b41f-e12586ed98ee',
            type: 'epm-packages-assets',
          },
          {
            id: 'e31da25f-a2ad-5d7a-b8cb-e0c4ff0036e8',
            type: 'epm-packages-assets',
          },
          {
            id: '0b84ce72-ead3-537f-b9f9-79d094d78d4e',
            type: 'epm-packages-assets',
          },
          {
            id: '6dc4776d-f0e7-5b22-ba46-6cd2e82510c0',
            type: 'epm-packages-assets',
          },
          {
            id: '5e341b4d-3a5d-57c7-80ff-af294bf9cc5d',
            type: 'epm-packages-assets',
          },
          {
            id: 'e85af2d2-8d80-5a20-8dc2-43af03df4af9',
            type: 'epm-packages-assets',
          },
          {
            id: '563da411-7931-51df-9086-9e7974d61401',
            type: 'epm-packages-assets',
          },
          {
            id: '4e10bff7-6c0c-55f6-88c0-241844d03eba',
            type: 'epm-packages-assets',
          },
          {
            id: 'fd405691-51b6-55e2-ada4-cfe2e7ac05ee',
            type: 'epm-packages-assets',
          },
          {
            id: '55f2d173-9c93-578a-85db-cc1f8c081a6a',
            type: 'epm-packages-assets',
          },
          {
            id: 'd60b0710-0b00-5bf0-ae84-88fe6867e8b7',
            type: 'epm-packages-assets',
          },
          {
            id: '17b1e231-6c6f-5cdd-aac1-a5d2fb5ad77e',
            type: 'epm-packages-assets',
          },
          {
            id: 'b14839c1-f0b1-5972-a33d-c27fffdecdea',
            type: 'epm-packages-assets',
          },
          {
            id: '5c90f8d0-1303-52c9-98fd-c887a10b5156',
            type: 'epm-packages-assets',
          },
          {
            id: '576f2cb7-c3f7-54cd-8867-7f5db0ea0181',
            type: 'epm-packages-assets',
          },
          {
            id: 'f1d3b54c-ac5c-5b16-bbc8-6fa7a30a830d',
            type: 'epm-packages-assets',
          },
          {
            id: '140002b7-becc-5d5e-94cd-6d0d2509fe76',
            type: 'epm-packages-assets',
          },
          {
            id: '00d83ffe-f12c-5b14-bf88-4dd56f61035d',
            type: 'epm-packages-assets',
          },
          {
            id: '5bac3cbc-0bfd-5a90-8705-4ce8d009725d',
            type: 'epm-packages-assets',
          },
          {
            id: '2e69cfa6-1114-5b12-bb3d-1c0c03ee1342',
            type: 'epm-packages-assets',
          },
          {
            id: 'c222cb4c-081e-5177-9ba3-d74da589ff3f',
            type: 'epm-packages-assets',
          },
          {
            id: '57bccf05-7422-5d2d-bb77-7483568c9224',
            type: 'epm-packages-assets',
          },
          {
            id: '65891658-69fd-5c65-a6da-49129ce35bad',
            type: 'epm-packages-assets',
          },
          {
            id: 'ed38f380-d847-51a5-9642-fc7cabaa05ca',
            type: 'epm-packages-assets',
          },
          {
            id: '4d941e9d-48b2-5d34-8367-e42b94749731',
            type: 'epm-packages-assets',
          },
          {
            id: '97d561ac-86ec-5897-b81c-497bdc2a1161',
            type: 'epm-packages-assets',
          },
          {
            id: 'd487aacb-1cfe-5f61-8a15-11537fe0697c',
            type: 'epm-packages-assets',
          },
          {
            id: '4db2b1d9-a85d-5e63-92f2-1b6c2b78cf06',
            type: 'epm-packages-assets',
          },
          {
            id: '03709276-036a-5e07-bfeb-38b2b64139f9',
            type: 'epm-packages-assets',
          },
          {
            id: '7c3b4348-d34c-5e15-bf53-1ed674b05b21',
            type: 'epm-packages-assets',
          },
          {
            id: 'f01f1b2e-0da0-562e-9b45-7522f7c3e77b',
            type: 'epm-packages-assets',
          },
          {
            id: '2d997745-8418-561e-86f4-788f2eb4fb0c',
            type: 'epm-packages-assets',
          },
          {
            id: '03a1c87a-a43b-5257-aaf5-3be4f4d632ba',
            type: 'epm-packages-assets',
          },
          {
            id: 'a37af953-176e-5e32-85c5-da9671ce4f2e',
            type: 'epm-packages-assets',
          },
          {
            id: '784c1144-fcdb-5684-9aa5-76ff1bc47324',
            type: 'epm-packages-assets',
          },
          {
            id: '5c874611-e4ec-5353-8d4c-7841f09c3051',
            type: 'epm-packages-assets',
          },
          {
            id: 'ddf93bfe-6d21-57d4-be98-cdf365bb3f13',
            type: 'epm-packages-assets',
          },
          {
            id: '417e458b-3741-5de1-b5e8-501a1a9e0f6b',
            type: 'epm-packages-assets',
          },
          {
            id: '136bbf6d-0a63-5088-8685-2c6d26f03f59',
            type: 'epm-packages-assets',
          },
          {
            id: '1c913ab0-9afa-5f79-865e-e44a47d066f1',
            type: 'epm-packages-assets',
          },
          {
            id: 'f74391c4-6e8a-5a27-9486-8525f52b36c5',
            type: 'epm-packages-assets',
          },
          {
            id: '087058d0-e7bf-59d0-896a-0dcb9d9a570b',
            type: 'epm-packages-assets',
          },
          {
            id: 'ce860d2b-f771-5a08-8225-7cf1afd96fcd',
            type: 'epm-packages-assets',
          },
          {
            id: '3a06e9da-ebc7-5531-a980-23e3cb86de02',
            type: 'epm-packages-assets',
          },
          {
            id: '711f1455-9e07-5c3a-a11f-f362c08fb452',
            type: 'epm-packages-assets',
          },
          {
            id: 'f574e863-e38a-5a0d-b578-0ed946b5468a',
            type: 'epm-packages-assets',
          },
          {
            id: '29181820-83c6-5127-988a-269451896254',
            type: 'epm-packages-assets',
          },
          {
            id: '763a3348-e7cb-546a-ad86-81958a1689b9',
            type: 'epm-packages-assets',
          },
          {
            id: 'a0dec889-17d3-5ac2-b95d-04bbfdce3157',
            type: 'epm-packages-assets',
          },
          {
            id: 'db23f433-b1e1-54ba-9afa-02e70163e83c',
            type: 'epm-packages-assets',
          },
          {
            id: '5f11a1bf-597e-5487-a095-7659c392a5bb',
            type: 'epm-packages-assets',
          },
          {
            id: '2e262321-fdb2-593b-a72b-3db407216633',
            type: 'epm-packages-assets',
          },
          {
            id: '58f5919e-5785-5fef-90e8-38395e0038db',
            type: 'epm-packages-assets',
          },
          {
            id: 'be985ede-d853-5e83-900b-df3e5aa9bd3a',
            type: 'epm-packages-assets',
          },
          {
            id: '79d24ce5-e559-55d4-a472-66d264c25ab6',
            type: 'epm-packages-assets',
          },
          {
            id: 'e3efa70d-c7da-5989-b258-887a79bf39de',
            type: 'epm-packages-assets',
          },
          {
            id: '5cc41639-8151-5dcb-91db-9cbc6915b1d3',
            type: 'epm-packages-assets',
          },
          {
            id: '083e964e-4e48-5271-822b-8f7b2dce4dd8',
            type: 'epm-packages-assets',
          },
          {
            id: '8d79b461-55a3-53e6-9d6b-b92864a7d5f0',
            type: 'epm-packages-assets',
          },
          {
            id: '7e761fd5-62c9-5f77-9427-213578f7498f',
            type: 'epm-packages-assets',
          },
          {
            id: '0e06037c-ce0f-50d2-a16a-a32e5f632da8',
            type: 'epm-packages-assets',
          },
          {
            id: 'a6a05d73-19a4-52ba-b3d1-02eaaf3d7b9b',
            type: 'epm-packages-assets',
          },
          {
            id: 'df5075ba-5910-566f-ba84-84bb8c692cc9',
            type: 'epm-packages-assets',
          },
          {
            id: '7f9ae2a5-e086-50c9-924b-45dddb8b76d6',
            type: 'epm-packages-assets',
          },
          {
            id: 'b486d488-4f6c-5f29-acf2-f793369d6188',
            type: 'epm-packages-assets',
          },
          {
            id: '389a7808-4698-5039-87cb-6ab4f7e1eae0',
            type: 'epm-packages-assets',
          },
          {
            id: 'e02a82bf-bf0b-5e92-9b5a-8285ad1a52eb',
            type: 'epm-packages-assets',
          },
          {
            id: '9379b6e7-e5f5-5ba9-b174-9125cb1ee76c',
            type: 'epm-packages-assets',
          },
          {
            id: '4fd4d826-5ea7-58a7-a246-2b449569f602',
            type: 'epm-packages-assets',
          },
          {
            id: '231f9666-6a08-53d2-a0ab-8da2b82f7ada',
            type: 'epm-packages-assets',
          },
          {
            id: 'b8e0ada0-cb83-54ee-b924-f088c198ecc7',
            type: 'epm-packages-assets',
          },
          {
            id: '2dbdc626-9a1b-5576-a8c6-aa182c97d228',
            type: 'epm-packages-assets',
          },
          {
            id: '1c12a013-82b5-52da-b873-94798ec7d2ce',
            type: 'epm-packages-assets',
          },
          {
            id: '9d9f32b2-eb0f-584f-972e-a326879e0bfe',
            type: 'epm-packages-assets',
          },
          {
            id: 'f1431004-2baa-54a0-b791-318d72757154',
            type: 'epm-packages-assets',
          },
          {
            id: 'cc411f61-3734-5fb4-97c5-c61ff2e1b05a',
            type: 'epm-packages-assets',
          },
          {
            id: '1719a42f-f653-55a6-b879-fa7bca79f77f',
            type: 'epm-packages-assets',
          },
          {
            id: '8d29b0e4-042a-556a-ac3f-9c4de92cf77e',
            type: 'epm-packages-assets',
          },
          {
            id: 'd74b45f5-001f-5ec1-8665-e7e95b0f233d',
            type: 'epm-packages-assets',
          },
          {
            id: '55fdbd3b-2f4a-5aec-9224-fb34c4f1c212',
            type: 'epm-packages-assets',
          },
          {
            id: 'd7215663-4278-5148-a57b-befecdc2123f',
            type: 'epm-packages-assets',
          },
          {
            id: 'e1c31072-ca11-5a08-b192-c6b6b330476c',
            type: 'epm-packages-assets',
          },
          {
            id: '7345876f-234b-5bc1-bddd-125e83b60255',
            type: 'epm-packages-assets',
          },
          {
            id: 'd3f8cdbd-105c-59c7-b5d8-34bf18b0cb46',
            type: 'epm-packages-assets',
          },
          {
            id: 'f070a7df-6dae-58d8-96f2-d030c4cc5184',
            type: 'epm-packages-assets',
          },
          {
            id: '9b7a9c7a-c925-51fa-8942-af378816c0bf',
            type: 'epm-packages-assets',
          },
          {
            id: '9af0ba7a-52a7-56a8-a2f4-0d8fef143757',
            type: 'epm-packages-assets',
          },
          {
            id: '91b93121-5088-5930-b9ac-fa9a643537ec',
            type: 'epm-packages-assets',
          },
          {
            id: 'b9ed8fdd-58f1-5523-9e74-f20cc12d787b',
            type: 'epm-packages-assets',
          },
          {
            id: '6e111583-649e-5edf-b66f-01f43467511a',
            type: 'epm-packages-assets',
          },
          {
            id: '2f72a5e2-6c88-5a63-a599-5862799c6ca9',
            type: 'epm-packages-assets',
          },
          {
            id: '6b12bc40-b5a9-52ad-b797-a159448652fb',
            type: 'epm-packages-assets',
          },
          {
            id: '26d03b35-8b9f-5fde-820d-6267f1aebf53',
            type: 'epm-packages-assets',
          },
          {
            id: '059f27cd-e074-5f10-bd40-b0760788ee91',
            type: 'epm-packages-assets',
          },
          {
            id: '6c580e87-8fc1-54f6-85ab-9393e0e4d37d',
            type: 'epm-packages-assets',
          },
          {
            id: '666e0e06-7597-5c4a-8195-d7972b8f2e08',
            type: 'epm-packages-assets',
          },
          {
            id: '51a0f0e9-2c37-5fb0-8b66-cb6178c52801',
            type: 'epm-packages-assets',
          },
          {
            id: '7b26a89b-a12b-5270-aa62-341b202f8fe8',
            type: 'epm-packages-assets',
          },
          {
            id: '958fad54-be5f-5179-82fa-8f621a9323f0',
            type: 'epm-packages-assets',
          },
          {
            id: '0964f86c-3118-5bc1-8af8-7db1d0394ef0',
            type: 'epm-packages-assets',
          },
          {
            id: 'da7acbc4-da77-5f87-a0f2-8e4a3f298172',
            type: 'epm-packages-assets',
          },
          {
            id: 'b051c802-cadd-543f-99d2-a9a1d7fba243',
            type: 'epm-packages-assets',
          },
          {
            id: 'af53017a-2dba-5fd7-8eea-7752e67e388a',
            type: 'epm-packages-assets',
          },
          {
            id: '6f9cbba4-a2fb-580b-a9d5-73a79dea8263',
            type: 'epm-packages-assets',
          },
          {
            id: '9b7019a3-66fb-5a45-bee2-00242a1e1770',
            type: 'epm-packages-assets',
          },
          {
            id: 'f1d12e9e-af81-56d7-81d7-596adb6d1146',
            type: 'epm-packages-assets',
          },
          {
            id: 'cd59bacd-892e-5202-9641-a02a720fbdb2',
            type: 'epm-packages-assets',
          },
          {
            id: '4bbda699-6819-58f4-ac75-a59adb263ebe',
            type: 'epm-packages-assets',
          },
          {
            id: '5fad7deb-4489-5ac5-b9fb-5b847204b9ac',
            type: 'epm-packages-assets',
          },
          {
            id: '12aca1cb-f4bb-5878-bfee-d7d45a8c0e81',
            type: 'epm-packages-assets',
          },
          {
            id: 'f3ab06ad-c1f1-556c-92a1-173e357afb8c',
            type: 'epm-packages-assets',
          },
          {
            id: '165aab12-d901-5568-8f9a-ab5b74e54867',
            type: 'epm-packages-assets',
          },
          {
            id: '87d7174f-dc0a-5f90-a98c-b4777035360c',
            type: 'epm-packages-assets',
          },
          {
            id: '0975161e-aa3a-59ac-bf20-4811844a8aab',
            type: 'epm-packages-assets',
          },
          {
            id: '44d5ce37-7b61-5494-9685-b56968bac54d',
            type: 'epm-packages-assets',
          },
          {
            id: 'e2e58028-d78d-5702-bb30-8bb081a457ea',
            type: 'epm-packages-assets',
          },
          {
            id: 'bda60661-3ee7-5c69-9ef5-5cfd55ff1cae',
            type: 'epm-packages-assets',
          },
          {
            id: 'f800cd09-c76e-5d2e-b639-da9fa99520eb',
            type: 'epm-packages-assets',
          },
          {
            id: '80aa97ca-d0bc-5cab-afa8-1a8c11682edd',
            type: 'epm-packages-assets',
          },
          {
            id: 'f815750f-f03c-5cb8-a45e-20b9a3a7bc22',
            type: 'epm-packages-assets',
          },
          {
            id: '6f8d92f7-80f4-584c-81a6-50543701adb9',
            type: 'epm-packages-assets',
          },
          {
            id: '93a1a4f5-0554-5089-a59b-6ca3319459ad',
            type: 'epm-packages-assets',
          },
          {
            id: '9ff13f94-2687-520e-be62-c6d0b2c89218',
            type: 'epm-packages-assets',
          },
          {
            id: '672c62d6-c24a-52ba-904e-3a502d591e79',
            type: 'epm-packages-assets',
          },
          {
            id: 'b90ac874-628b-57ca-9663-dca9632a8c45',
            type: 'epm-packages-assets',
          },
          {
            id: '3dbe7093-69aa-517e-8301-405e48e59051',
            type: 'epm-packages-assets',
          },
          {
            id: '19752e35-ee5c-5683-8a9b-d129ff71c162',
            type: 'epm-packages-assets',
          },
          {
            id: '93e79ab8-6d64-5d99-974d-89521c354b45',
            type: 'epm-packages-assets',
          },
          {
            id: '46d66f9e-6fac-5004-9bd0-2d6078f0739d',
            type: 'epm-packages-assets',
          },
          {
            id: '50257938-fd37-5d8b-8ae9-93ea39a47e9c',
            type: 'epm-packages-assets',
          },
          {
            id: 'b799ffc1-7e6e-5da6-b6cd-842bda37d01f',
            type: 'epm-packages-assets',
          },
          {
            id: 'a7a292ea-4e3f-5c1a-bb9a-3b466165a429',
            type: 'epm-packages-assets',
          },
          {
            id: 'aa66e955-a443-5fe5-96c3-00199a9fb5d0',
            type: 'epm-packages-assets',
          },
          {
            id: '39a22cf9-b766-5241-ad8b-d18b9aa8df50',
            type: 'epm-packages-assets',
          },
          {
            id: '8d0b51b9-2bb4-575a-a149-51733de8003a',
            type: 'epm-packages-assets',
          },
          {
            id: '60c3f393-3171-5890-8239-0c631fc3a14a',
            type: 'epm-packages-assets',
          },
          {
            id: '69cd3134-5051-548f-9758-494c6354ff35',
            type: 'epm-packages-assets',
          },
          {
            id: '6b556824-89f1-5d3b-8bee-d59ecf874c11',
            type: 'epm-packages-assets',
          },
          {
            id: 'dc73b22f-a8ac-5170-8cbb-7d4d38d8bc00',
            type: 'epm-packages-assets',
          },
          {
            id: '3b6cc790-f311-5f79-8bbb-d658d81edd38',
            type: 'epm-packages-assets',
          },
          {
            id: '040a0b65-35a6-5813-92e2-feeb6a40b018',
            type: 'epm-packages-assets',
          },
          {
            id: '188f4e4a-45c1-5cc7-8278-feed4336bec6',
            type: 'epm-packages-assets',
          },
          {
            id: '54c52c7a-baec-5382-802e-33c6870d59f9',
            type: 'epm-packages-assets',
          },
          {
            id: '573ec1c9-da4d-57ef-82be-967aef48d83f',
            type: 'epm-packages-assets',
          },
          {
            id: '6c737ba6-11c0-587e-b8e0-ec2e866371e1',
            type: 'epm-packages-assets',
          },
          {
            id: '26a2a1b7-38d1-5740-9a27-bd17e027f7b2',
            type: 'epm-packages-assets',
          },
          {
            id: '051fdd40-0212-5321-aeeb-1728e7ae53d7',
            type: 'epm-packages-assets',
          },
          {
            id: '04c6eaec-4640-50b0-9efe-a642b4aae216',
            type: 'epm-packages-assets',
          },
          {
            id: 'f3a8de34-d8f4-50ca-a886-43baf333f5be',
            type: 'epm-packages-assets',
          },
          {
            id: 'd9368d92-e820-597f-9218-b2aa932c434b',
            type: 'epm-packages-assets',
          },
          {
            id: 'd29075e3-40d0-580a-aaec-b03cdb617cc0',
            type: 'epm-packages-assets',
          },
          {
            id: 'f1a54648-7c44-5c4f-8424-4042cca607e6',
            type: 'epm-packages-assets',
          },
          {
            id: '2861cc7c-b7a2-5b15-b278-4db559dc0a5d',
            type: 'epm-packages-assets',
          },
          {
            id: '51d0ae10-229b-5899-9da5-9121b44a86bf',
            type: 'epm-packages-assets',
          },
          {
            id: 'dcb7e0df-b8e6-5734-a66d-1ce6bc7c0223',
            type: 'epm-packages-assets',
          },
          {
            id: '9e989e61-490b-526d-9e54-3f91c36e79c7',
            type: 'epm-packages-assets',
          },
          {
            id: 'cd257f39-46bf-5f9c-aa3c-39f0e0ca7597',
            type: 'epm-packages-assets',
          },
          {
            id: '33853dbc-7979-5d20-aa98-160e5ebc4244',
            type: 'epm-packages-assets',
          },
          {
            id: '9048c9e2-18a3-5119-981a-d7ca191be801',
            type: 'epm-packages-assets',
          },
          {
            id: '1a1733e0-9f09-5ac6-a419-21d2f1b9666e',
            type: 'epm-packages-assets',
          },
          {
            id: 'f7ac8629-a4f6-5c98-90fd-b0477fccba74',
            type: 'epm-packages-assets',
          },
          {
            id: '68520af7-8007-5905-899c-072de167f361',
            type: 'epm-packages-assets',
          },
          {
            id: 'a2b18338-7df4-51a2-a73d-1a8b437515b8',
            type: 'epm-packages-assets',
          },
          {
            id: '0fc2b9aa-eca6-538c-a837-5201dcb11a71',
            type: 'epm-packages-assets',
          },
          {
            id: '92836dfc-f2c6-5bb2-a894-1380e17b43f8',
            type: 'epm-packages-assets',
          },
          {
            id: '4c0a30e6-c549-569b-b30c-357a30b8da3d',
            type: 'epm-packages-assets',
          },
          {
            id: '2668e8ff-b1df-5101-aaf0-7a5b05c366d3',
            type: 'epm-packages-assets',
          },
          {
            id: 'cf821d9d-2e6c-551a-b531-9ce5c435b7e4',
            type: 'epm-packages-assets',
          },
          {
            id: 'dedc165b-ae21-5ac4-a7b3-7c3edc6630ba',
            type: 'epm-packages-assets',
          },
          {
            id: '31e07239-4a6e-57ec-89b5-583d6b2709a5',
            type: 'epm-packages-assets',
          },
          {
            id: '93ffa150-4107-5505-9236-7fdcec538c4f',
            type: 'epm-packages-assets',
          },
          {
            id: '0d97ad87-b383-5ea8-b801-25b680c2d7d0',
            type: 'epm-packages-assets',
          },
          {
            id: '8aa84a63-fb84-50f3-bd3f-c7bb29a89af6',
            type: 'epm-packages-assets',
          },
          {
            id: 'c85d8839-6640-5a78-9ea6-7f03ba9fc51a',
            type: 'epm-packages-assets',
          },
          {
            id: 'c074a913-ea70-5480-b7ed-07a9a93f40cf',
            type: 'epm-packages-assets',
          },
          {
            id: 'fbcec175-4095-5e91-ad9e-437a1ac9584f',
            type: 'epm-packages-assets',
          },
          {
            id: '5e3614f8-067a-54bc-b951-b3ea030b9be3',
            type: 'epm-packages-assets',
          },
          {
            id: '2974eddc-3a5f-5a09-bc62-93538b50fc70',
            type: 'epm-packages-assets',
          },
          {
            id: 'bf6d6ef7-7789-5b9c-aae5-6fe8db72cb24',
            type: 'epm-packages-assets',
          },
          {
            id: 'd67e0090-fa3b-5e61-a904-1ad701254182',
            type: 'epm-packages-assets',
          },
          {
            id: '9f9f0f9c-8d63-5665-9fb7-8a9f45fe247a',
            type: 'epm-packages-assets',
          },
          {
            id: '23b847fa-f386-5d10-b0b7-504831bf03d3',
            type: 'epm-packages-assets',
          },
          {
            id: '48e9edd3-6275-5651-94dc-f84d59c5e000',
            type: 'epm-packages-assets',
          },
          {
            id: '2db92138-78cc-5d57-954f-7384e50e0d46',
            type: 'epm-packages-assets',
          },
          {
            id: '06f39986-ae21-5f3e-b784-01e82f323dc2',
            type: 'epm-packages-assets',
          },
          {
            id: '2de02893-ff19-5910-9f99-6dda03d7c5e8',
            type: 'epm-packages-assets',
          },
          {
            id: 'f4ab1085-e651-58e3-a3f1-61013e49c52a',
            type: 'epm-packages-assets',
          },
          {
            id: 'e05ef072-d40c-5e96-95f9-9e5d6b8fdfd8',
            type: 'epm-packages-assets',
          },
          {
            id: '6a9e30e1-6e29-51ca-b139-b9455471c4aa',
            type: 'epm-packages-assets',
          },
          {
            id: '25fe3eb0-81f5-50d3-96bf-1cf520fb5f2b',
            type: 'epm-packages-assets',
          },
          {
            id: '3b2ff5fb-e011-5996-b4d8-1350dea44011',
            type: 'epm-packages-assets',
          },
          {
            id: '1c403bef-ee6d-5914-9821-ac8493b69842',
            type: 'epm-packages-assets',
          },
          {
            id: '8b020f17-1522-552d-8e6b-c1dd232dcf84',
            type: 'epm-packages-assets',
          },
          {
            id: 'e31a648e-9344-5837-919d-60038e37bcc2',
            type: 'epm-packages-assets',
          },
          {
            id: '5b9412ab-3b86-53e3-9d37-ba297e3e9d82',
            type: 'epm-packages-assets',
          },
          {
            id: 'd0517d7f-d352-5d42-a69b-be1e8f29facc',
            type: 'epm-packages-assets',
          },
          {
            id: '31b00140-beb8-59b4-bab8-a2b3110ee028',
            type: 'epm-packages-assets',
          },
          {
            id: '7a14010e-0af3-52f9-9cc6-4abbd711a2ec',
            type: 'epm-packages-assets',
          },
          {
            id: '42bf2853-8f0b-51ed-a83f-43a0eef0e69c',
            type: 'epm-packages-assets',
          },
          {
            id: '6ab1c44b-fb31-58f2-bea3-89610bb85033',
            type: 'epm-packages-assets',
          },
          {
            id: 'b40691b2-a9fa-5ed8-92b6-dddcba93778c',
            type: 'epm-packages-assets',
          },
          {
            id: '8efe38d9-648a-5e7d-8491-51d24406ae87',
            type: 'epm-packages-assets',
          },
          {
            id: '2c02d373-6c2c-5312-9a6d-4c823e95cce9',
            type: 'epm-packages-assets',
          },
          {
            id: '3976bb6c-5bc6-586e-92a9-a94ac1844a80',
            type: 'epm-packages-assets',
          },
          {
            id: '036f7167-6000-5a73-8c21-3dc079973054',
            type: 'epm-packages-assets',
          },
          {
            id: '7c7f845d-4824-5387-94ac-589d1c1b8536',
            type: 'epm-packages-assets',
          },
          {
            id: 'af7d2530-6254-50bf-8d6d-1fdb86bbea12',
            type: 'epm-packages-assets',
          },
          {
            id: 'cb22ffac-9010-56b5-bb51-feeb1ff49903',
            type: 'epm-packages-assets',
          },
          {
            id: '526b63f6-76da-5cb6-a511-8b6ef368d8be',
            type: 'epm-packages-assets',
          },
          {
            id: '02d6549b-7f9f-5360-bf21-183cb9065b50',
            type: 'epm-packages-assets',
          },
          {
            id: '918f71de-1ab1-5662-a50e-a1a235f9cdfe',
            type: 'epm-packages-assets',
          },
          {
            id: '8d0c593b-c7ae-5190-ba74-caeefb473f06',
            type: 'epm-packages-assets',
          },
          {
            id: 'b4928fed-4b26-5721-8982-8e985c54c151',
            type: 'epm-packages-assets',
          },
          {
            id: 'dff8573e-b91b-56ee-99e1-7b605e4e0b78',
            type: 'epm-packages-assets',
          },
          {
            id: '999ecb6a-d0ef-5f09-b93b-f5ef5041e928',
            type: 'epm-packages-assets',
          },
          {
            id: '30a65433-4678-5252-8588-1c2d5eb06c82',
            type: 'epm-packages-assets',
          },
          {
            id: '86ab9714-31e7-5625-98c7-d303eac35336',
            type: 'epm-packages-assets',
          },
          {
            id: '3d13b34b-1254-5feb-bf46-84ed005468ba',
            type: 'epm-packages-assets',
          },
          {
            id: '6c1f565a-7fb4-5b3e-a4bb-a8072306f869',
            type: 'epm-packages-assets',
          },
          {
            id: '6c305802-12f6-58fd-9979-fc52fc494c74',
            type: 'epm-packages-assets',
          },
          {
            id: 'b7cfc3ba-0e9d-50dc-b52a-6d2f91f94d27',
            type: 'epm-packages-assets',
          },
          {
            id: 'abc29ba1-5bf2-5685-a518-e8ab9b5ab174',
            type: 'epm-packages-assets',
          },
          {
            id: '85a9890a-7c64-5113-9ca8-0da157eefb1a',
            type: 'epm-packages-assets',
          },
          {
            id: '27661e6f-a30a-5365-bd1d-2cb1b5c0d41a',
            type: 'epm-packages-assets',
          },
          {
            id: '3b9ddf7f-133c-53c4-bb01-e32e18896ae5',
            type: 'epm-packages-assets',
          },
          {
            id: '08811d02-e3ed-5645-a2a8-f300fe7d166c',
            type: 'epm-packages-assets',
          },
          {
            id: '8f6eb04b-4313-5d5a-ac05-354914d0f98d',
            type: 'epm-packages-assets',
          },
          {
            id: '8a871681-368e-5039-b739-4048738a1d62',
            type: 'epm-packages-assets',
          },
          {
            id: '46e7dfa4-17d7-596f-8cba-b675155e527b',
            type: 'epm-packages-assets',
          },
          {
            id: 'a67744b6-e2ee-51f7-b366-0a90acd0db55',
            type: 'epm-packages-assets',
          },
          {
            id: 'ddf46bcf-9a54-5703-b900-e0eab0387954',
            type: 'epm-packages-assets',
          },
          {
            id: '42fd7566-ac3c-58f9-95f0-f1113bd6c7b4',
            type: 'epm-packages-assets',
          },
          {
            id: '7b4f945b-99a0-5660-8707-2669e601f1de',
            type: 'epm-packages-assets',
          },
          {
            id: 'c902879a-cd96-5911-b5c3-b59a299ad537',
            type: 'epm-packages-assets',
          },
          {
            id: '74aee54b-85e5-5022-92ff-f185cfc4206a',
            type: 'epm-packages-assets',
          },
          {
            id: 'aeec412b-aa37-5f4c-84ae-d9c2ecab908d',
            type: 'epm-packages-assets',
          },
          {
            id: '1a21a3d5-c1cf-5e91-85e9-208b8b151d73',
            type: 'epm-packages-assets',
          },
          {
            id: '980d1022-5fa3-5ba0-bb2e-d69404dd6bef',
            type: 'epm-packages-assets',
          },
          {
            id: 'e4473aed-5c33-5dea-a2d3-a91ac13117d8',
            type: 'epm-packages-assets',
          },
        ],
        es_index_patterns: {
          application: 'logs-system.application-*',
          auth: 'logs-system.auth-*',
          core: 'metrics-system.core-*',
          cpu: 'metrics-system.cpu-*',
          diskio: 'metrics-system.diskio-*',
          filesystem: 'metrics-system.filesystem-*',
          fsstat: 'metrics-system.fsstat-*',
          load: 'metrics-system.load-*',
          memory: 'metrics-system.memory-*',
          network: 'metrics-system.network-*',
          process: 'metrics-system.process-*',
          process_summary: 'metrics-system.process.summary-*',
          security: 'logs-system.security-*',
          socket_summary: 'metrics-system.socket_summary-*',
          syslog: 'logs-system.syslog-*',
          system: 'logs-system.system-*',
          uptime: 'metrics-system.uptime-*',
        },
        name: 'system',
        version: '1.1.2',
        internal: false,
        removable: false,
        install_version: '1.1.2',
        install_status: 'installed',
        install_started_at: '2021-08-25T19:44:43.380Z',
        install_source: 'registry',
        keep_policies_up_to_date: false,
      },
      references: [],
      coreMigrationVersion: '7.14.0',
      updated_at: '2021-08-25T19:45:12.096Z',
      version: 'Wzc3NjUsNF0=',
      // score: 0, TODO: this is not represented in any type, but is returned by the API
    },
  },
  {
    name: 'tomcat',
    title: 'Apache Tomcat',
    version: '0.3.0',
    release: 'experimental',
    description: 'Apache Tomcat Integration',
    type: 'integration',
    download: '/epr/tomcat/tomcat-0.3.0.zip',
    path: '/package/tomcat/0.3.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/tomcat/0.3.0/img/logo.svg',
        title: 'Apache Tomcat logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'log',
        title: 'Apache Tomcat',
        description: 'Collect Apache Tomcat logs from syslog or a file.',
      },
    ],
    id: 'tomcat',
    status: 'not_installed',
  },
  {
    name: 'traefik',
    title: 'Traefik',
    version: '0.3.0',
    release: 'experimental',
    description: 'Traefik Integration',
    type: 'integration',
    download: '/epr/traefik/traefik-0.3.0.zip',
    path: '/package/traefik/0.3.0',
    icons: [
      {
        src: '/img/traefik.svg',
        path: '/package/traefik/0.3.0/img/traefik.svg',
        title: 'traefik',
        size: '259x296',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'traefik',
        title: 'Traefik logs and metrics',
        description: 'Collect logs and metrics from Traefik instances',
      },
    ],
    id: 'traefik',
    status: 'not_installed',
  },
  {
    name: 'windows',
    title: 'Windows',
    version: '1.0.0',
    release: 'ga',
    description: 'Windows Integration',
    type: 'integration',
    download: '/epr/windows/windows-1.0.0.zip',
    path: '/package/windows/1.0.0',
    icons: [
      {
        src: '/img/logo_windows.svg',
        path: '/package/windows/1.0.0/img/logo_windows.svg',
        title: 'logo windows',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'windows',
        title: 'Windows logs and metrics',
        description: 'Collect logs and metrics from Windows instances',
      },
    ],
    id: 'windows',
    status: 'not_installed',
  },
  {
    name: 'winlog',
    title: 'Custom Windows event logs',
    version: '0.4.0',
    release: 'experimental',
    description: 'This Elastic integration collects custom Windows event logs',
    type: 'integration',
    download: '/epr/winlog/winlog-0.4.0.zip',
    path: '/package/winlog/0.4.0',
    icons: [
      {
        src: '/img/logo_windows.svg',
        path: '/package/winlog/0.4.0/img/logo_windows.svg',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'winlogs',
        title: 'Custom Windows event logs',
        description: 'Collect your custom Windows event logs.',
      },
    ],
    id: 'winlog',
    status: 'not_installed',
  },
  {
    name: 'zeek',
    title: 'Zeek',
    version: '1.3.0',
    release: 'ga',
    description: 'This Elastic integration collects logs from Zeek',
    type: 'integration',
    download: '/epr/zeek/zeek-1.3.0.zip',
    path: '/package/zeek/1.3.0',
    icons: [
      {
        src: '/img/zeek.svg',
        path: '/package/zeek/1.3.0/img/zeek.svg',
        title: 'zeek',
        size: '214x203',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'zeek',
        title: 'Zeek logs',
        description: 'Collect logs from Zeek instances',
      },
    ],
    id: 'zeek',
    status: 'not_installed',
  },
  {
    name: 'zerofox',
    title: 'ZeroFox',
    version: '0.1.1',
    release: 'experimental',
    description: 'ZeroFox Cloud Platform',
    type: 'integration',
    download: '/epr/zerofox/zerofox-0.1.1.zip',
    path: '/package/zerofox/0.1.1',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/zerofox/0.1.1/img/logo.svg',
        title: 'logo ZeroFox',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'zerofox',
        title: 'ZeroFox Alerts',
        description: 'Collect alert from the ZeroFox API',
      },
    ],
    id: 'zerofox',
    status: 'not_installed',
  },
  {
    name: 'zookeeper',
    title: 'ZooKeeper',
    version: '0.3.1',
    release: 'experimental',
    description: 'ZooKeeper Integration',
    type: 'integration',
    download: '/epr/zookeeper/zookeeper-0.3.1.zip',
    path: '/package/zookeeper/0.3.1',
    icons: [
      {
        src: '/img/zookeeper.svg',
        path: '/package/zookeeper/0.3.1/img/zookeeper.svg',
        title: 'zookeeper',
        size: '754x754',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'zookeeper',
        title: 'ZooKeeper metrics',
        description: 'Collect metrics from ZooKeeper instances',
      },
    ],
    id: 'zookeeper',
    status: 'not_installed',
  },
  {
    name: 'zoom',
    title: 'Zoom',
    version: '0.6.0',
    release: 'beta',
    description: 'This Elastic integration collects logs from Zoom',
    type: 'integration',
    download: '/epr/zoom/zoom-0.6.0.zip',
    path: '/package/zoom/0.6.0',
    icons: [
      {
        src: '/img/zoom_blue.svg',
        path: '/package/zoom/0.6.0/img/zoom_blue.svg',
        title: 'Zoom',
        size: '516x240',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'zoom',
        title: 'Zoom logs',
        description: 'Collect logs from Zoom instances',
      },
    ],
    id: 'zoom',
    status: 'not_installed',
  },
  {
    name: 'zscaler',
    title: 'Zscaler NSS',
    version: '0.2.0',
    release: 'experimental',
    description: 'Zscaler NSS Integration',
    type: 'integration',
    download: '/epr/zscaler/zscaler-0.2.0.zip',
    path: '/package/zscaler/0.2.0',
    icons: [
      {
        src: '/img/logo.svg',
        path: '/package/zscaler/0.2.0/img/logo.svg',
        title: 'Zscaler NSS logo',
        size: '32x32',
        type: 'image/svg+xml',
      },
    ],
    policy_templates: [
      {
        name: 'zia',
        title: 'Zscaler NSS',
        description: 'Collect Zscaler NSS logs from syslog or a file.',
      },
    ],
    id: 'zscaler',
    status: 'not_installed',
  },
];
