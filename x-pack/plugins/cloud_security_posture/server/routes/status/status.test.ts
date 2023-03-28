/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateCspStatusCode } from './status';
import { CSPM_POLICY_TEMPLATE, VULN_MGMT_POLICY_TEMPLATE } from '../../../common/constants';

describe('calculateCspStatusCode for cspm', () => {
  it('Verify status when there are no permission for cspm', async () => {
    const statusCode = calculateCspStatusCode(
      CSPM_POLICY_TEMPLATE,
      {
        findingsLatest: 'unprivileged',
        findings: 'unprivileged',
        score: 'unprivileged',
      },
      1,
      1,
      1,
      ['cspm']
    );

    expect(statusCode).toMatch('unprivileged');
  });

  it('Verify status when there are no findings, no healthy agents and no installed policy templates', async () => {
    const statusCode = calculateCspStatusCode(
      CSPM_POLICY_TEMPLATE,
      {
        findingsLatest: 'empty',
        findings: 'empty',
        score: 'empty',
      },
      0,
      0,
      0,
      []
    );

    expect(statusCode).toMatch('not-installed');
  });

  it('Verify status when there are findings and installed policies but no healthy agents', async () => {
    const statusCode = calculateCspStatusCode(
      CSPM_POLICY_TEMPLATE,
      {
        findingsLatest: 'empty',
        findings: 'not-empty',
        score: 'not-empty',
      },
      1,
      0,
      10,
      ['cspm']
    );

    expect(statusCode).toMatch('not-deployed');
  });

  it('Verify status when there are findings ,installed policies and healthy agents', async () => {
    const statusCode = calculateCspStatusCode(
      CSPM_POLICY_TEMPLATE,
      {
        findingsLatest: 'not-empty',
        findings: 'not-empty',
        score: 'not-empty',
      },
      1,
      1,
      10,
      ['cspm']
    );

    expect(statusCode).toMatch('indexed');
  });

  it('Verify status when there are no findings ,installed policies and no healthy agents', async () => {
    const statusCode = calculateCspStatusCode(
      CSPM_POLICY_TEMPLATE,
      {
        findingsLatest: 'empty',
        findings: 'empty',
        score: 'empty',
      },
      1,
      0,
      10,
      ['cspm']
    );

    expect(statusCode).toMatch('not-deployed');
  });

  it('Verify status when there are installed policies, healthy agents and no findings', async () => {
    const statusCode = calculateCspStatusCode(
      CSPM_POLICY_TEMPLATE,
      {
        findingsLatest: 'empty',
        findings: 'empty',
        score: 'empty',
      },
      1,
      1,
      9,
      ['cspm']
    );

    expect(statusCode).toMatch('waiting_for_results');
  });

  it('Verify status when there are installed policies, healthy agents and no findings and been more than 10 minutes', async () => {
    const statusCode = calculateCspStatusCode(
      CSPM_POLICY_TEMPLATE,
      {
        findingsLatest: 'empty',
        findings: 'empty',
        score: 'empty',
      },
      1,
      1,
      11,
      ['cspm']
    );

    expect(statusCode).toMatch('index-timeout');
  });

  it('Verify status when there are installed policies, healthy agents past findings but no recent findings', async () => {
    const statusCode = calculateCspStatusCode(
      CSPM_POLICY_TEMPLATE,
      {
        findingsLatest: 'empty',
        findings: 'not-empty',
        score: 'not-empty',
      },
      1,
      1,
      0,
      ['cspm']
    );

    expect(statusCode).toMatch('indexing');
  });
});

describe('calculateCspStatusCode for vul_mgmt', () => {
  it('Verify status when there are no permission for vul_mgmt', async () => {
    const statusCode = calculateCspStatusCode(
      VULN_MGMT_POLICY_TEMPLATE,
      {
        findingsLatest: 'unprivileged',
        findings: 'unprivileged',
        score: 'unprivileged',
      },
      1,
      1,
      1,
      ['cspm']
    );

    expect(statusCode).toMatch('unprivileged');
  });

  it('Verify status when there are no vul_mgmt findings, no healthy agents and no installed policy templates', async () => {
    const statusCode = calculateCspStatusCode(
      VULN_MGMT_POLICY_TEMPLATE,
      {
        findingsLatest: 'empty',
        findings: 'empty',
        score: 'empty',
      },
      0,
      0,
      0,
      []
    );

    expect(statusCode).toMatch('not-installed');
  });

  it('Verify status when there are vul_mgmt findings and installed policies but no healthy agents', async () => {
    const statusCode = calculateCspStatusCode(
      VULN_MGMT_POLICY_TEMPLATE,
      {
        findingsLatest: 'empty',
        findings: 'not-empty',
        score: 'not-empty',
      },
      1,
      0,
      10,
      [VULN_MGMT_POLICY_TEMPLATE]
    );

    expect(statusCode).toMatch('not-deployed');
  });

  it('Verify status when there are vul_mgmt findings ,installed policies and healthy agents', async () => {
    const statusCode = calculateCspStatusCode(
      VULN_MGMT_POLICY_TEMPLATE,
      {
        findingsLatest: 'not-empty',
        findings: 'not-empty',
        score: 'not-empty',
      },
      1,
      1,
      10,
      [VULN_MGMT_POLICY_TEMPLATE]
    );

    expect(statusCode).toMatch('indexed');
  });

  it('Verify status when there are no vul_mgmt findings ,installed policies and no healthy agents', async () => {
    const statusCode = calculateCspStatusCode(
      VULN_MGMT_POLICY_TEMPLATE,
      {
        findingsLatest: 'empty',
        findings: 'empty',
        score: 'empty',
      },
      1,
      0,
      10,
      [VULN_MGMT_POLICY_TEMPLATE]
    );

    expect(statusCode).toMatch('not-deployed');
  });

  it('Verify status when there are installed policies, healthy agents and no vul_mgmt findings', async () => {
    const statusCode = calculateCspStatusCode(
      VULN_MGMT_POLICY_TEMPLATE,
      {
        findingsLatest: 'empty',
        findings: 'empty',
        score: 'empty',
      },
      1,
      1,
      9,
      [VULN_MGMT_POLICY_TEMPLATE]
    );

    expect(statusCode).toMatch('waiting_for_results');
  });

  it('Verify status when there are installed policies, healthy agents and no vul_mgmt findings and been more than 10 minutes', async () => {
    const statusCode = calculateCspStatusCode(
      VULN_MGMT_POLICY_TEMPLATE,
      {
        findingsLatest: 'empty',
        findings: 'empty',
        score: 'empty',
      },
      1,
      1,
      11,
      [VULN_MGMT_POLICY_TEMPLATE]
    );

    expect(statusCode).toMatch('index-timeout');
  });

  it('Verify status when there are installed policies, healthy agents past vul_mgmt findings but no recent findings', async () => {
    const statusCode = calculateCspStatusCode(
      VULN_MGMT_POLICY_TEMPLATE,
      {
        findingsLatest: 'empty',
        findings: 'not-empty',
        score: 'not-empty',
      },
      1,
      1,
      0,
      [VULN_MGMT_POLICY_TEMPLATE]
    );

    expect(statusCode).toMatch('indexing');
  });
});
