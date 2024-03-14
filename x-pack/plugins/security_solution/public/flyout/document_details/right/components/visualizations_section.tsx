/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../common/lib/kibana';
import { useExpandSection } from '../hooks/use_expand_section';
import { AnalyzerPreviewContainer } from './analyzer_preview_container';
import { SessionPreviewContainer } from './session_preview_container';
import { ExpandableSection } from './expandable_section';
import { VISUALIZATIONS_TEST_ID } from './test_ids';

const KEY = 'visualizations';

/**
 * Visualizations section in overview. It contains analyzer preview and session view preview.
 */
export const VisualizationsSection: FC = memo(() => {
  const { storage } = useKibana().services;
  const expanded = useExpandSection({ title: KEY, defaultValue: false, storage });

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.visualizations.sectionTitle"
          defaultMessage="Visualizations"
        />
      }
      localStorageKey={KEY}
      storage={storage}
      data-test-subj={VISUALIZATIONS_TEST_ID}
    >
      <SessionPreviewContainer />
      <EuiSpacer />
      <AnalyzerPreviewContainer />
    </ExpandableSection>
  );
});

VisualizationsSection.displayName = 'VisualizationsSection';
