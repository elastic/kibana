/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInstallCommandForPlatform } from './install_command_utils';

describe('getInstallCommandForPlatform', () => {
  describe('without policy id', () => {
    it('should return the correct command if the the policyId is not set for linux', () => {
      const res = getInstallCommandForPlatform('http://elasticsearch:9200', 'service-token-1');

      expect(res.linux).toMatchInlineSnapshot(`
        "sudo ./elastic-agent install  \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1"
      `);
    });

    it('should return the correct command if the the policyId is not set for mac', () => {
      const res = getInstallCommandForPlatform('http://elasticsearch:9200', 'service-token-1');

      expect(res.mac).toMatchInlineSnapshot(`
        "sudo ./elastic-agent install  \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1"
      `);
    });

    it('should return the correct command if the the policyId is not set for windows', () => {
      const res = getInstallCommandForPlatform('http://elasticsearch:9200', 'service-token-1');

      expect(res.windows).toMatchInlineSnapshot(`
        ".\\\\elastic-agent.exe install  \`
          --fleet-server-es=http://elasticsearch:9200 \`
          --fleet-server-service-token=service-token-1"
      `);
    });

    it('should return the correct command if the the policyId is not set for rpm', () => {
      const res = getInstallCommandForPlatform('http://elasticsearch:9200', 'service-token-1');

      expect(res.rpm).toMatchInlineSnapshot(`
        "sudo elastic-agent enroll  \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1"
      `);
    });

    it('should return the correct command if the the policyId is not set for deb', () => {
      const res = getInstallCommandForPlatform('http://elasticsearch:9200', 'service-token-1');

      expect(res.deb).toMatchInlineSnapshot(`
        "sudo elastic-agent enroll  \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1"
      `);
    });

    it('should return the correct command sslCATrustedFingerprint option is passed', () => {
      const res = getInstallCommandForPlatform(
        'http://elasticsearch:9200',
        'service-token-1',
        undefined,
        undefined,
        false,
        'fingerprint123456'
      );

      expect(res.linux).toMatchInlineSnapshot(`
        "sudo ./elastic-agent install  \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-es-ca-trusted-fingerprint=fingerprint123456"
      `);
    });
  });

  describe('with policy id', () => {
    it('should return the correct command if the the policyId is set for linux', () => {
      const res = getInstallCommandForPlatform(
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1'
      );

      expect(res.linux).toMatchInlineSnapshot(`
        "sudo ./elastic-agent install  \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1"
      `);
    });

    it('should return the correct command if the the policyId is set for mac', () => {
      const res = getInstallCommandForPlatform(
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1'
      );

      expect(res.mac).toMatchInlineSnapshot(`
        "sudo ./elastic-agent install  \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1"
      `);
    });

    it('should return the correct command if the the policyId is set for windows', () => {
      const res = getInstallCommandForPlatform(
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1'
      );

      expect(res.windows).toMatchInlineSnapshot(`
        ".\\\\elastic-agent.exe install  \`
          --fleet-server-es=http://elasticsearch:9200 \`
          --fleet-server-service-token=service-token-1 \`
          --fleet-server-policy=policy-1"
      `);
    });

    it('should return the correct command if the the policyId is set for rpm', () => {
      const res = getInstallCommandForPlatform(
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1'
      );

      expect(res.rpm).toMatchInlineSnapshot(`
        "sudo elastic-agent enroll  \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1"
      `);
    });

    it('should return the correct command if the the policyId is set for deb', () => {
      const res = getInstallCommandForPlatform(
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1'
      );

      expect(res.deb).toMatchInlineSnapshot(`
        "sudo elastic-agent enroll  \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1"
      `);
    });
  });

  describe('with policy id and fleet server host and production deployment', () => {
    it('should return the correct command if the the policyId is set for linux', () => {
      const res = getInstallCommandForPlatform(
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1',
        'http://fleetserver:8220',
        true
      );

      expect(res.linux).toMatchInlineSnapshot(`
        "sudo ./elastic-agent install --url=http://fleetserver:8220 \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --certificate-authorities=<PATH_TO_CA> \\\\
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \\\\
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \\\\
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY>"
      `);
    });

    it('should return the correct command if the the policyId is set for mac', () => {
      const res = getInstallCommandForPlatform(
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1',
        'http://fleetserver:8220',
        true
      );

      expect(res.mac).toMatchInlineSnapshot(`
        "sudo ./elastic-agent install --url=http://fleetserver:8220 \\\\
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
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1',
        'http://fleetserver:8220',
        true
      );

      expect(res.windows).toMatchInlineSnapshot(`
        ".\\\\elastic-agent.exe install --url=http://fleetserver:8220 \`
          --fleet-server-es=http://elasticsearch:9200 \`
          --fleet-server-service-token=service-token-1 \`
          --fleet-server-policy=policy-1 \`
          --certificate-authorities=<PATH_TO_CA> \`
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \`
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \`
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY>"
      `);
    });

    it('should return the correct command if the the policyId is set for rpm', () => {
      const res = getInstallCommandForPlatform(
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1',
        'http://fleetserver:8220',
        true
      );

      expect(res.rpm).toMatchInlineSnapshot(`
        "sudo elastic-agent enroll --url=http://fleetserver:8220 \\\\
          --fleet-server-es=http://elasticsearch:9200 \\\\
          --fleet-server-service-token=service-token-1 \\\\
          --fleet-server-policy=policy-1 \\\\
          --certificate-authorities=<PATH_TO_CA> \\\\
          --fleet-server-es-ca=<PATH_TO_ES_CERT> \\\\
          --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT> \\\\
          --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY>"
      `);
    });

    it('should return the correct command if the the policyId is set for deb', () => {
      const res = getInstallCommandForPlatform(
        'http://elasticsearch:9200',
        'service-token-1',
        'policy-1',
        'http://fleetserver:8220',
        true
      );

      expect(res.deb).toMatchInlineSnapshot(`
        "sudo elastic-agent enroll --url=http://fleetserver:8220 \\\\
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
});
