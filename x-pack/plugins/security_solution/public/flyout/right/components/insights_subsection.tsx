/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';

export interface InsightsSectionProps {
  /**
   * Renders a loading spinner if true
   */
  loading?: boolean;
  /**
   * Returns a null component if true
   */
  error?: boolean;
  /**
   * Title at the top of the component
   */
  title: string;
  /**
   * Content of the component
   */
  children: React.ReactNode;
  /**
   * Prefix data-test-subj to use for the elements
   */
  ['data-test-subj']?: string;
}

/**
 * Presentational component to handle loading and error in the subsections of the Insights section.
 * Should be used for Entities, Threat Intelligence, Prevalence, Correlations and Results
 */
export const InsightsSubSection: React.FC<InsightsSectionProps> = ({
  loading = false,
  error = false,
  title,
  'data-test-subj': dataTestSubj,
  children,
}) => {
  const loadingDataTestSubj = `${dataTestSubj}Loading`;
  // showing the loading in this component instead of SummaryPanel because we're hiding the entire section if no data

  if (loading) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner data-test-subj={loadingDataTestSubj} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // hide everything
  if (error || !title || !children) {
    return null;
  }

  const titleDataTestSubj = `${dataTestSubj}Title`;
  const contentDataTestSubj = `${dataTestSubj}Content`;

  return (
    <>
      <EuiTitle size="xxs" data-test-subj={titleDataTestSubj}>
        <h5>{title}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup data-test-subj={contentDataTestSubj} direction="column" gutterSize="s">
        {children}
      </EuiFlexGroup>
    </>
  );
};

InsightsSubSection.displayName = 'InsightsSubSection';
