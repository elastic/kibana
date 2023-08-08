/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsContract } from '@kbn/data-views-plugin/common';

import { getFieldsForWildcard } from './get_fields_for_wildcard';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';

const mockFields = [
  {
    name: 'agent.id',
    type: 'string',
    esTypes: ['keyword'],
  },
  {
    name: 'agent.name',
    type: 'string',
    esTypes: ['keyword'],
  },
];

const dataViewsMock = {
  getFieldsForWildcard: jest.fn().mockResolvedValue(mockFields),
} as unknown as DataViewsContract;

const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();

describe('getFieldsForWildcard', () => {
  it('should return empty array and not call dataViews API for eql language', async () => {
    const fields = await getFieldsForWildcard({
      index: ['auditbeat-*'],
      language: 'eql',
      dataViews: dataViewsMock,
      ruleExecutionLogger,
    });

    expect(fields).toEqual([]);
    expect(dataViewsMock.getFieldsForWildcard).not.toHaveBeenCalled();
  });
  it('should return empty array and not call dataViews API for lucene language', async () => {
    const fields = await getFieldsForWildcard({
      index: ['auditbeat-*'],
      language: 'lucene',
      dataViews: dataViewsMock,
      ruleExecutionLogger,
    });

    expect(fields).toEqual([]);
    expect(dataViewsMock.getFieldsForWildcard).not.toHaveBeenCalled();
  });
  it('should return empty array and not call dataViews API for non existing index', async () => {
    const fields = await getFieldsForWildcard({
      index: undefined,
      language: 'kuery',
      dataViews: dataViewsMock,
      ruleExecutionLogger,
    });

    expect(fields).toEqual([]);
    expect(dataViewsMock.getFieldsForWildcard).not.toHaveBeenCalled();
  });
  it('should return fields and call dataViews API for kuery language', async () => {
    const fields = await getFieldsForWildcard({
      index: ['auditbeat-*', 'filebeat-*'],
      language: 'kuery',
      dataViews: dataViewsMock,
      ruleExecutionLogger,
    });

    expect(fields).toEqual(mockFields);
    expect(dataViewsMock.getFieldsForWildcard).toHaveBeenCalledWith({
      pattern: 'auditbeat-*,filebeat-*',
      allowNoIndex: true,
    });
  });
  it('should return empty array on dataViews API error', async () => {
    (dataViewsMock.getFieldsForWildcard as jest.Mock).mockRejectedValue(Error('some test error'));
    const fields = await getFieldsForWildcard({
      index: ['auditbeat-*', 'filebeat-*'],
      language: 'kuery',
      dataViews: dataViewsMock,
      ruleExecutionLogger,
    });

    expect(fields).toEqual([]);
    expect(ruleExecutionLogger.error).toHaveBeenCalledWith(
      expect.stringMatching('some test error')
    );
  });
});
