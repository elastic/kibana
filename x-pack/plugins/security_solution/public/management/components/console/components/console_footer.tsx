/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';
import { useWithFooterContent } from '../hooks/state_selectors/use_with_footer_content';

export const ConsoleFooter = memo(() => {
  const footerContent = useWithFooterContent();
  const getTestId = useTestIdGenerator(useDataTestSubj());

  return (
    <EuiPanel
      hasShadow={false}
      paddingSize="none"
      color="transparent"
      data-test-subj={getTestId('footer')}
    >
      <EuiText size="xs" color="subdued" className="font-style-italic">
        {footerContent || <>&nbsp;</>}
      </EuiText>
    </EuiPanel>
  );
});
ConsoleFooter.displayName = 'ConsoleFooter';
