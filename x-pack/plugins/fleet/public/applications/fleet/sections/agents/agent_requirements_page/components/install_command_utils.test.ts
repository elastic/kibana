/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInstallCommandForPlatform } from './install_command_utils';

describe('getInstallCommandForPlatform', () => {
  describe('without policy id', () => {
    it('should return the correct command if the the policyId is not set for linux-mac', () => {
      const res = getInstallCommandForPlatform(
        'linux-mac',
        'http://elasticsearch:9200',
        'service-token-1'
      );

      expect(res).toMatchInlineSnapshot(`
        "sudo ./elastic-agent install  -f \\\\
         --fleet-server-es=http://elasticsearch:9200 \\\\
         --fleet-server-service-token=service-token-1"
      `);
    });

    it('should return the correct command if the the policyId is not set for windows', () => {
      const res = getInstallCommandForPlatform(
        'windows',
        'http://elasticsearch:9200',
        'service-token-1'
      );

      expect(res).toMatchInlineSnapshot(`
        ".\\\\elastic-agent.exe install  -f \`
         --fleet-server-es=http://elasticsearch:9200 \`
         --fleet-server-service-token=service-token-1"
      `);
    });

    it('should return the correct command if the the policyId is not set for rpm-deb', () => {
      const res = getInstallCommandForPlatform(
        'rpm-deb',
        'http://elasticsearch:9200',
        'service-token-1'
      );

      expect(res).toMatchInlineSnapshot(`
        "sudo elastic-agent enroll  -f \\\\
         --fleet-server-es=http://elasticsearch:9200 \\\\
         --fleet-server-service-token=service-token-1"
      `);
    });
  });

  describe('with policy id', () => {
    it('should return the correct command if the the policyId is set for linux-mac', () => {
      const res = getInstallCommandForPlatform(
        'linux-mac',
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1'
      );

      expect(res).toMatchInlineSnapshot(`
        "sudo ./elastic-agent install  -f \\\\
         --fleet-server-es=http://elasticsearch:9200 \\\\
         --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1"
      `);
    });

    it('should return the correct command if the the policyId is set for windows', () => {
      const res = getInstallCommandForPlatform(
        'windows',
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1'
      );

      expect(res).toMatchInlineSnapshot(`
        ".\\\\elastic-agent.exe install  -f \`
         --fleet-server-es=http://elasticsearch:9200 \`
         --fleet-server-service-token=service-token-1 \`
          --fleet-server-policy=policy-1"
      `);
    });

    it('should return the correct command if the the policyId is set for rpm-deb', () => {
      const res = getInstallCommandForPlatform(
        'rpm-deb',
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1'
      );

      expect(res).toMatchInlineSnapshot(`
        "sudo elastic-agent enroll  -f \\\\
         --fleet-server-es=http://elasticsearch:9200 \\\\
         --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1"
      `);
    });
  });

  describe('with policy id and fleet server host and production deployment', () => {
    it('should return the correct command if the the policyId is set for linux-mac', () => {
      const res = getInstallCommandForPlatform(
        'linux-mac',
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1',
        'http://fleetserver:8220',
        true
      );

      expect(res).toMatchInlineSnapshot(`
        "sudo ./elastic-agent install --url=http://fleetserver:8220 \\\\
         -f \\\\
         --fleet-server-es=http://elasticsearch:9200 \\\\
         --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --certificate-authorities=<PATH_TO_CA> \\\\
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \\\\
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \\\\
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY>"
      `);
    });

    it('should return the correct command if the the policyId is set for windows', () => {
      const res = getInstallCommandForPlatform(
        'windows',
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1',
        'http://fleetserver:8220',
        true
      );

      expect(res).toMatchInlineSnapshot(`
        ".\\\\elastic-agent.exe install --url=http://fleetserver:8220 \`
         -f \`
         --fleet-server-es=http://elasticsearch:9200 \`
         --fleet-server-service-token=service-token-1 \`
          --fleet-server-policy=policy-1 \`
          --certificate-authorities=<PATH_TO_CA> \`
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \`
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \`
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY>"
      `);
    });

    it('should return the correct command if the the policyId is set for rpm-deb', () => {
      const res = getInstallCommandForPlatform(
        'rpm-deb',
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1',
        'http://fleetserver:8220',
        true
      );

      expect(res).toMatchInlineSnapshot(`
        "sudo elastic-agent enroll --url=http://fleetserver:8220 \\\\
         -f \\\\
         --fleet-server-es=http://elasticsearch:9200 \\\\
         --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --certificate-authorities=<PATH_TO_CA> \\\\
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \\\\
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \\\\
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY>"
      `);
    });
  });

  it('should return nothing for an invalid platform', () => {
    const res = getInstallCommandForPlatform(
      'rpm-deb',
      'http://elasticsearch:9200',
      'service-token-1'
    );

    expect(res).toMatchInlineSnapshot(`
      "sudo elastic-agent enroll  -f \\\\
       --fleet-server-es=http://elasticsearch:9200 \\\\
       --fleet-server-service-token=service-token-1"
    `);
  });
});
