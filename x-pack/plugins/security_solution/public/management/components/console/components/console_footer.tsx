/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EuiPanel, EuiText } from '@elastic/eui';
import { useWithInputVisibleState } from '../hooks/state_selectors/use_with_input_visible_state';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';
import { useWithFooterContent } from '../hooks/state_selectors/use_with_footer_content';

export const ConsoleFooter = memo(() => {
  const footerContent = useWithFooterContent();
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const inputVisibleState = useWithInputVisibleState();

  const textColor: EuiTextProps['color'] = useMemo(() => {
    return inputVisibleState === 'error' ? 'danger' : 'subdued';
  }, [inputVisibleState]);

  return (
    <EuiPanel
      hasShadow={false}
      paddingSize="none"
      color="transparent"
      data-test-subj={getTestId('footer')}
    >
      <EuiText size="xs" color={textColor} className="font-style-italic">
        {footerContent || <>&nbsp;</>}
      </EuiText>
    </EuiPanel>
  );
});
ConsoleFooter.displayName = 'ConsoleFooter';
