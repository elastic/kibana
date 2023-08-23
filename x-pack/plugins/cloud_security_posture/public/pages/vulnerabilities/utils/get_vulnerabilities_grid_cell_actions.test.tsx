/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRowValueByColumnId } from './get_vulnerabilities_grid_cell_actions';
import { vulnerabilitiesColumns } from '../vulnerabilities_table_columns';
import { vulnerabilitiesByResourceColumns } from '../vulnerabilities_by_resource/vulnerabilities_by_resource_table_columns';
import { CspVulnerabilityFinding } from '../../../../common/schemas';

describe('getRowValueByColumnId', () => {
  it('should return vulnerability id', () => {
    const vulnerabilityRow = {
      vulnerability: {
        id: 'CVE-2017-1000117',
      },
    };
    const columns = vulnerabilitiesColumns;
    const columnId = columns.vulnerability;

    expect(
      getRowValueByColumnId(vulnerabilityRow as Partial<CspVulnerabilityFinding>, columns, columnId)
    ).toEqual('CVE-2017-1000117');
  });

  it('should return base as a vulnerability score', () => {
    const vulnerabilityRow = {
      vulnerability: {
        score: {
          base: 5,
          version: 'v1',
        },
      },
    };
    const columns = vulnerabilitiesColumns;
    const columnId = columns.cvss;

    expect(
      getRowValueByColumnId(vulnerabilityRow as Partial<CspVulnerabilityFinding>, columns, columnId)
    ).toEqual(5);
  });

  it('should return undefined when no base score is available', () => {
    const vulnerabilityRow = {
      vulnerability: {},
    };
    const columns = vulnerabilitiesColumns;
    const columnId = columns.cvss;

    expect(
      getRowValueByColumnId(vulnerabilityRow as Partial<CspVulnerabilityFinding>, columns, columnId)
    ).toEqual(undefined);

    const vulnerabilityRow2 = {
      vulnerability: {
        score: {
          version: 'v1',
        },
      },
    };

    expect(
      getRowValueByColumnId(
        vulnerabilityRow2 as Partial<CspVulnerabilityFinding>,
        columns,
        columnId
      )
    ).toEqual(undefined);
  });

  it('should return resource id', () => {
    const vulnerabilityRow = {
      resource: {
        id: 'i-1234567890abcdef0',
      },
    };
    const columns = vulnerabilitiesByResourceColumns;
    const columnId = columns.resourceId;

    expect(
      getRowValueByColumnId(vulnerabilityRow as Partial<CspVulnerabilityFinding>, columns, columnId)
    ).toEqual('i-1234567890abcdef0');
  });

  it('should return resource name', () => {
    const vulnerabilityRow = {
      resource: {
        name: 'test',
      },
    };
    const columns1 = vulnerabilitiesByResourceColumns;
    const columns2 = vulnerabilitiesColumns;
    const columnId1 = columns1.resourceName;
    const columnId2 = columns2.resourceName;

    expect(
      getRowValueByColumnId(
        vulnerabilityRow as Partial<CspVulnerabilityFinding>,
        columns1,
        columnId1
      )
    ).toEqual('test');
    expect(
      getRowValueByColumnId(
        vulnerabilityRow as Partial<CspVulnerabilityFinding>,
        columns2,
        columnId2
      )
    ).toEqual('test');
  });

  it('should return vulnerability severity', () => {
    const vulnerabilityRow = {
      vulnerability: {
        severity: 'high',
      },
    };
    const columns = vulnerabilitiesColumns;
    const columnId = columns.severity;

    expect(
      getRowValueByColumnId(vulnerabilityRow as Partial<CspVulnerabilityFinding>, columns, columnId)
    ).toEqual('high');
  });

  it('should return package fields', () => {
    const vulnerabilityRow = {
      vulnerability: {
        package: {
          name: 'test',
          version: '1.0.0',
          fixed_version: '1.0.1',
        },
      },
    };
    const columns1 = vulnerabilitiesColumns;
    const columnId1 = columns1.package;
    const columnId2 = columns1.version;
    const columnId3 = columns1.fixedVersion;

    expect(
      getRowValueByColumnId(
        vulnerabilityRow as Partial<CspVulnerabilityFinding>,
        columns1,
        columnId1
      )
    ).toEqual('test');
    expect(
      getRowValueByColumnId(
        vulnerabilityRow as Partial<CspVulnerabilityFinding>,
        columns1,
        columnId2
      )
    ).toEqual('1.0.0');
    expect(
      getRowValueByColumnId(
        vulnerabilityRow as Partial<CspVulnerabilityFinding>,
        columns1,
        columnId3
      )
    ).toEqual('1.0.1');
  });

  it('should return undefined is package is missing', () => {
    const vulnerabilityRow = {
      vulnerability: {},
    };
    const columns = vulnerabilitiesColumns;
    const columnId = columns.package;

    expect(
      getRowValueByColumnId(vulnerabilityRow as Partial<CspVulnerabilityFinding>, columns, columnId)
    ).toEqual(undefined);
  });

  it('should return cloud region', () => {
    const vulnerabilityRow = {
      cloud: {
        region: 'us-east-1',
      },
    };
    const columns = vulnerabilitiesByResourceColumns;
    const columnId = columns.region;

    expect(
      getRowValueByColumnId(vulnerabilityRow as Partial<CspVulnerabilityFinding>, columns, columnId)
    ).toEqual('us-east-1');
  });
});
