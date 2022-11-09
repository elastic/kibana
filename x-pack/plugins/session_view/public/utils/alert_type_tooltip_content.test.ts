/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize } from 'lodash';
import { ALERT } from '../../common/constants';
import { ProcessEventAlertCategory } from '../../common/types/process_tree';
import { getAlertTypeTooltipContent } from './alert_type_tooltip_content';

describe('getAlertTypeTooltipContent(category)', () => {
  it('should display `File alert` for tooltip content', () => {
    expect(getAlertTypeTooltipContent(ProcessEventAlertCategory.file)).toEqual('File alert');
  });

  it('should display `Process alert` for tooltip content', () => {
    expect(getAlertTypeTooltipContent(ProcessEventAlertCategory.process)).toEqual('Process alert');
  });

  it('should display `Network alert` for tooltip content', () => {
    expect(getAlertTypeTooltipContent(ProcessEventAlertCategory.network)).toEqual('Network alert');
  });

  it('should display `Alert` when category is undefined', () => {
    expect(getAlertTypeTooltipContent(ALERT)).toEqual(`${capitalize(ALERT)} `);
  });

  it('should display `Unknown category alert` when there is a unknown category', () => {
    expect(getAlertTypeTooltipContent('unknown category')).toEqual(`Unknown category ${ALERT}`);
  });
});
