/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { find } from 'lodash/fp';
import { ExpandableSection } from './expandable_section';
import { VISUALIZATIONS_SECTION_TEST_ID, ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { VISUALIZATIONS_TITLE } from './translations';
import { AnalyzerPreview } from './analyzer_preview';
import { useRightPanelContext } from '../context';

export interface VisualizatioinsSectionProps {
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded?: boolean;
}

/**
 * Visualizations section in overview. It contains analyzer preview and session view preview.
 */
export const VisualizationsSection: React.FC<VisualizatioinsSectionProps> = ({
  expanded = false,
}) => {
  const { dataFormattedForFieldBrowser: data } = useRightPanelContext();
  const documentId = find({ category: 'kibana', field: 'kibana.alert.ancestors.id' }, data);
  const index = find({ category: 'kibana', field: 'kibana.alert.rule.parameters.index' }, data);
  const entityId = find({ category: 'process', field: 'process.entity_id' }, data);

  const showAnalyzerPreview = entityId && documentId && index;

  return (
    <ExpandableSection
      expanded={expanded}
      title={VISUALIZATIONS_TITLE}
      data-test-subj={VISUALIZATIONS_SECTION_TEST_ID}
    >
      {showAnalyzerPreview && (
        <AnalyzerPreview
          entityId={entityId}
          documentId={documentId}
          index={index}
          data-test-subj={ANALYZER_PREVIEW_TEST_ID}
        />
      )}
    </ExpandableSection>
  );
};

VisualizationsSection.displayName = 'VisualizationsSection';
