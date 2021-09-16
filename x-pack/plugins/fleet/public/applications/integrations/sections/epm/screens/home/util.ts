/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomIntegration } from '../../../../../../../../../../src/plugins/custom_integrations/common';

const CATEGORY_PACKAGE_MAP = {
  aws: { aws: 18 },
  azure: { azure: 5, azure_application_insights: 3, azure_metrics: 9, microsoft: 1 },
  cloud: { aws: 18, azure: 5, gcp: 1, zerofox: 1 },
  config_management: { osquery_manager: 1, zookeeper: 1 },
  containers: { docker: 1, kubernetes: 9 },
  custom: { log: 1, snapshot: 1, staging: 1, winlog: 1 },
  datastore: {
    aws: 5,
    elasticsearch: 1,
    mongodb: 1,
    mysql: 1,
    postgresql: 1,
    prometheus: 1,
    redis: 1,
    zookeeper: 1,
  },
  elastic_stack: { apm: 1, elastic_agent: 1, elasticsearch: 1, fleet_server: 1, synthetics: 1 },
  google_cloud: { gcp: 1 },
  kubernetes: { kubernetes: 9, stan: 1 },
  message_queue: { kafka: 1, nats: 1, rabbitmq: 1, redis: 1, stan: 1 },
  monitoring: { apm: 1, prometheus: 1, synthetics: 1, vsphere: 1, zeek: 1 },
  network: {
    aws: 6,
    azure: 5,
    barracuda: 1,
    bluecoat: 1,
    cef: 1,
    cisco: 1,
    cisco_asa: 1,
    cisco_ftd: 1,
    cisco_ios: 1,
    cisco_meraki: 1,
    cisco_nexus: 1,
    cisco_umbrella: 1,
    cloudflare: 1,
    f5: 1,
    gcp: 1,
    haproxy: 1,
    imperva: 1,
    infoblox: 1,
    iptables: 1,
    juniper: 1,
    microsoft: 1,
    netflow: 1,
    sonicwall: 1,
    suricata: 1,
    zeek: 1,
    zscaler: 1,
  },
  os_system: {
    auditd: 1,
    docker: 1,
    linux: 1,
    osquery: 1,
    osquery_manager: 1,
    santa: 1,
    system: 1,
    vsphere: 1,
    windows: 1,
  },
  productivity: { zoom: 1 },
  security: {
    aws: 4,
    azure: 5,
    barracuda: 1,
    bluecoat: 1,
    carbonblack_edr: 1,
    cef: 1,
    checkpoint: 1,
    cisco: 1,
    cisco_asa: 1,
    cisco_ftd: 1,
    cisco_ios: 1,
    cisco_meraki: 1,
    cisco_nexus: 1,
    cisco_umbrella: 1,
    cloudflare: 1,
    crowdstrike: 1,
    cyberark: 1,
    cyberarkpas: 1,
    cylance: 1,
    endpoint: 1,
    f5: 1,
    fortinet: 1,
    gcp: 1,
    google_workspace: 1,
    hashicorp_vault: 1,
    imperva: 1,
    iptables: 1,
    juniper: 1,
    microsoft: 1,
    netflow: 1,
    netscout: 1,
    nginx: 1,
    nginx_ingress_controller: 1,
    o365: 1,
    okta: 1,
    osquery: 1,
    osquery_manager: 1,
    panw: 1,
    panw_cortex_xdr: 1,
    proofpoint: 1,
    radware: 1,
    santa: 1,
    security_detection_engine: 1,
    sonicwall: 1,
    sophos: 1,
    squid: 1,
    suricata: 1,
    symantec: 1,
    system: 1,
    tomcat: 1,
    traefik: 1,
    windows: 1,
    zeek: 1,
    zerofox: 1,
    zoom: 1,
    zscaler: 1,
  },
  web: {
    activemq: 1,
    apache: 1,
    azure_application_insights: 3,
    azure_metrics: 9,
    cloudflare: 1,
    haproxy: 1,
    iis: 1,
    network_traffic: 1,
    nginx: 1,
    nginx_ingress_controller: 1,
    synthetics: 1,
    tomcat: 1,
    traefik: 1,
  },
};

export function replaceEprPackages(eprPackages, customIntegrations: CustomIntegration[]) {
  const nonGaPackages = eprPackages.filter((p) => p.release !== 'ga');
  const gaPackages = eprPackages.filter((p) => p.release === 'ga');

  const nonGaWithoutIntegrationReplacement = nonGaPackages.filter((p) => {
    const matchingIntegration = customIntegrations.find((integration) => {
      return integration.eprPackageOverlap === p.name;
    });
    return !matchingIntegration;
  });

  const replacementNonGa = customIntegrations.filter((p) => {
    const matchingCard = nonGaPackages.find((c) => c.name === p.eprPackageOverlap);
    return !!matchingCard;
  });

  const replacementList = [
    ...gaPackages,
    ...nonGaWithoutIntegrationReplacement,
    ...replacementNonGa,
  ];
  return replacementList;
}

export function getEprCategoryCounts() {
  const cats = [];
  Object.keys(CATEGORY_PACKAGE_MAP).forEach((category) => {
    const packages = CATEGORY_PACKAGE_MAP[category];
    const cat = {
      id: category,
      count: 0,
    };
    Object.values(packages).forEach((value) => {
      cat.count += value;
    });
    cats.push(cat);
  });
  return cats;
}

export function mergeAndReplaceCategoryCounts(
  addableIntegrations: CustomIntegration[],
  replaceableIntegrations: CustomIntegration[]
) {
  const counts = getEprCategoryCounts();

  addableIntegrations.forEach((integration) => {
    integration.categories.forEach((cat) => {
      const match = counts.find((c) => {
        return c.id === cat;
      });

      if (match) {
        match.count += 1;
      } else {
        counts.push({
          id: cat,
          count: 1,
        });
      }
    });
  });

  counts.sort((a, b) => {
    return a.id.localeCompare(b.id);
  });

  return counts;
}
