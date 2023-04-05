/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessEventAlertCategory } from '../types/process_tree';
import { getAlertIconTooltipContent } from './alert_icon_tooltip_content';

describe('getAlertTypeTooltipContent(category)', () => {
  it('should display `File alert` for tooltip content', () => {
    expect(getAlertIconTooltipContent(ProcessEventAlertCategory.file)).toEqual('File alert');
  });

  it('should display `Process alert` for tooltip content', () => {
    expect(getAlertIconTooltipContent(ProcessEventAlertCategory.process)).toEqual('Process alert');
  });

  it('should display `Network alert` for tooltip content', () => {
    expect(getAlertIconTooltipContent(ProcessEventAlertCategory.network)).toEqual('Network alert');
  });
});
