export const GLOBAL_DATA_TAG_EXCLUDED_INPUTS = new Set<string>(
  [
    'apm',
    'pf-host-agent',
    'pf-elastic-symbolizer',
    'pf-elastic-collector',
    'fleet-server',
    'cloud-defend',
    // all of the cloudbeat inputs are excluded (eg cloudbeat/cis_k8s)
    // https://github.com/elastic/elastic-agent/blob/main/specs/cloudbeat.spec.yml
    'cloudbeat',
  ],
)
