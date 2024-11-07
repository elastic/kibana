/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { SetupGuide } from '../../../../../../../../../common/api/detection_engine';
import { MarkdownRenderer } from '../../../../../../../../common/components/markdown_editor';

interface SetupReadOnlyProps {
  setup: SetupGuide;
}

export function SetupReadOnly({ setup }: SetupReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.SETUP_GUIDE_SECTION_LABEL,
          description: <Setup setup={setup} />,
        },
      ]}
    />
  );
}

interface SetupProps {
  setup: SetupGuide;
}

function Setup({ setup }: SetupProps) {
  return <MarkdownRenderer textSize="s">{setup}</MarkdownRenderer>;
}
