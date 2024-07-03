/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutionRunTypeFilter } from '.';
import { RuleRunTypeEnum } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { useKibana } from '../../../../../../common/lib/kibana';

jest.mock('../../../../../../common/lib/kibana');

const mockTelemetry = {
  reportEventLogFilterByRunType: jest.fn(),
};

const mockUseKibana = useKibana as jest.Mock;

mockUseKibana.mockReturnValue({
  services: {
    telemetry: mockTelemetry,
  },
});

const items = [RuleRunTypeEnum.backfill, RuleRunTypeEnum.standard];

describe('ExecutionRunTypeFilter', () => {
  it('calls telemetry.reportEventLogFilterByRunType on selection change', () => {
    const handleChange = jest.fn();

    render(<ExecutionRunTypeFilter items={items} selectedItems={[]} onChange={handleChange} />);

    const select = screen.getByText('Run type');
    fireEvent.click(select);

    const manualRun = screen.getByText('Manual');
    fireEvent.click(manualRun);

    expect(handleChange).toHaveBeenCalledWith([RuleRunTypeEnum.backfill]);
    expect(mockTelemetry.reportEventLogFilterByRunType).toHaveBeenCalledWith({
      runType: [RuleRunTypeEnum.backfill],
    });
  });
});
